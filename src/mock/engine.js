// =====================================================================
//  MOCK BACKEND MOTORU
//  Gerçek bir backend'in yapacağı işleri tarayıcıda simüle eder:
//   • fiyat akışı (random walk), mum / emir defteri / son işlemler
//   • emir eşleştirme (market, limit, stop, stop-limit, trailing, OCO)
//   • pozisyon & bakiye muhasebesi, TP/SL
//   • kural motoru, bot simülasyonu, risk / kill switch
//  Sadece VITE_USE_MOCK=true iken yüklenir.
// =====================================================================
import * as seed from './data'
import { fmtNum, fmtQty } from '../utils/format'

const STORE_KEY = 'tn-mock-db-v1'
const TICK_MS = 1000

export class MockError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

const gauss = () => {
  let u = 0
  let v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const clone = (x) => JSON.parse(JSON.stringify(x))
const decimalsOf = (step) => {
  const s = String(step)
  if (s.includes('e-')) return +s.split('e-')[1]
  return s.includes('.') ? s.split('.')[1].length : 0
}
const roundTo = (v, step) => +(Math.round(v / step) * step).toFixed(decimalsOf(step))
const ACCOUNT_CCY = { crypto: 'USDT', bist: 'TRY', forex: 'USD' }
const SIDE_TR = { buy: 'alış', sell: 'satış' }
export const INTERVALS = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 }

class MockEngine {
  constructor() {
    this.listeners = new Map()
    this.instruments = new Map(seed.instruments.map((i) => [i.symbol, i]))
    this.providers = new Map(seed.providers.map((p) => [p.id, p]))
    this.prices = new Map()
    this.candles = new Map()
    this.trades = new Map()
    this.historyCache = new Map()
    this.ruleArmed = new Map()
    this.tickCount = 0
    // Dış katmanların (ör. admin/platform kuralları) emir ve bağlantı öncesi kontrol eklemesi için
    this.tradeGuards = []
    this.connectionGuards = []

    for (const i of seed.instruments) {
      const chg = gauss() * (i.market === 'crypto' ? 0.025 : i.market === 'bist' ? 0.015 : 0.004)
      const open = i.price / (1 + chg)
      this.prices.set(i.symbol, {
        last: i.price,
        open,
        high: Math.max(i.price, open) * (1 + Math.random() * 0.006),
        low: Math.min(i.price, open) * (1 - Math.random() * 0.006),
        volume: (0.2 + Math.random()) * (i.market === 'crypto' ? 4e8 : i.market === 'bist' ? 2e9 : 1e9),
      })
    }
    this.load()
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  // ------------------------------------------------------------------ durum
  load() {
    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
    } catch {
      saved = null
    }
    this.db = saved || {
      connections: clone(seed.connections),
      balances: clone(seed.balances),
      positions: clone(seed.positions),
      orders: clone(seed.orders),
      rules: clone(seed.rules),
      bots: clone(seed.bots),
      risk: clone(seed.risk),
      activity: clone(seed.activity),
      user: clone(seed.user),
    }
    const today = new Date().toDateString()
    if (this.db.dayKey !== today || !this.db.dayStartValue) {
      this.db.dayKey = today
      this.db.dayStartValue = this.totalValueUsd() * (1 - 0.009)
    }
  }

  save() {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.db))
      } catch {
        /* depolama yoksa yoksay */
      }
    }, 400)
  }

  reset() {
    try {
      localStorage.removeItem(STORE_KEY)
    } catch {
      /* yoksay */
    }
    this.db = null
    this.ruleArmed.clear()
    this.load()
    ;['exchanges', 'orders', 'positions', 'balances', 'rules', 'bots', 'risk', 'activity'].forEach((c) => this.emit(c, null))
  }

  // ------------------------------------------------------------------ pub/sub
  subscribe(channel, fn) {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set())
    this.listeners.get(channel).add(fn)
    return () => {
      const set = this.listeners.get(channel)
      set?.delete(fn)
      if (set && !set.size) this.listeners.delete(channel)
    }
  }
  hasListeners(channel) {
    return !!this.listeners.get(channel)?.size
  }
  emit(channel, data) {
    this.listeners.get(channel)?.forEach((fn) => {
      try {
        fn(data)
      } catch (e) {
        console.error('[mock] listener hatası', e)
      }
    })
  }

  // ------------------------------------------------------------------ yardımcılar
  instrument(symbol) {
    const i = this.instruments.get(symbol)
    if (!i) throw new MockError(404, `Bilinmeyen sembol: ${symbol}`)
    return i
  }
  conn(id) {
    const c = this.db.connections.find((x) => x.id === id)
    if (!c) throw new MockError(404, 'Borsa bağlantısı bulunamadı')
    return c
  }
  provider(conn) {
    return this.providers.get(conn.provider)
  }
  last(symbol) {
    return this.prices.get(symbol).last
  }
  accountCcy(conn) {
    return ACCOUNT_CCY[conn.market] || 'USD'
  }
  toUsd(amount, ccy) {
    switch (ccy) {
      case 'TRY':
        return amount / this.last('USD/TRY')
      case 'EUR':
        return amount * this.last('EUR/USD')
      case 'GBP':
        return amount * this.last('GBP/USD')
      case 'JPY':
        return amount / this.last('USD/JPY')
      default:
        return amount
    }
  }
  convert(amount, from, to) {
    if (from === to) return amount
    const usd = this.toUsd(amount, from)
    switch (to) {
      case 'TRY':
        return usd * this.last('USD/TRY')
      case 'EUR':
        return usd / this.last('EUR/USD')
      case 'GBP':
        return usd / this.last('GBP/USD')
      case 'JPY':
        return usd * this.last('USD/JPY')
      default:
        return usd
    }
  }
  cash(conn, create = true) {
    const asset = this.accountCcy(conn)
    let b = this.db.balances.find((x) => x.exchangeId === conn.id && x.asset === asset)
    if (!b && create) {
      b = { exchangeId: conn.id, asset, free: 0 }
      this.db.balances.push(b)
    }
    return b
  }
  positionMetrics(p) {
    const price = this.last(p.symbol)
    const dir = p.side === 'long' ? 1 : -1
    const pnl = (price - p.entryPrice) * p.qty * dir
    return { markPrice: price, pnl, pnlPct: p.margin ? (pnl / p.margin) * 100 : 0, value: p.margin + pnl, notional: p.qty * price }
  }
  totalValueUsd() {
    let total = 0
    for (const b of this.db.balances) total += this.toUsd(b.free, b.asset)
    for (const p of this.db.positions) {
      const m = this.positionMetrics(p)
      total += this.toUsd(m.value, this.instrument(p.symbol).quote)
    }
    return total
  }
  log(level, source, message, extra = {}, notify = false) {
    const entry = { id: uid('ac'), ts: Date.now(), level, source, message, notify, ...extra }
    this.db.activity.unshift(entry)
    if (this.db.activity.length > 300) this.db.activity.length = 300
    this.emit('activity', entry)
    this.save()
    return entry
  }

  // ------------------------------------------------------------------ piyasa
  ticker(symbol) {
    const p = this.prices.get(symbol)
    const ins = this.instruments.get(symbol)
    const spread = Math.max(ins.tickSize, p.last * 0.0001)
    return {
      symbol,
      last: p.last,
      open: p.open,
      high: p.high,
      low: p.low,
      change: p.last - p.open,
      changePct: ((p.last - p.open) / p.open) * 100,
      volume: p.volume,
      bid: roundTo(p.last - spread / 2, ins.tickSize),
      ask: roundTo(p.last + spread / 2, ins.tickSize),
      ts: Date.now(),
    }
  }
  tickers(symbols) {
    const list = symbols?.length ? symbols : [...this.prices.keys()]
    return list.filter((s) => this.prices.has(s)).map((s) => this.ticker(s))
  }

  candlesFor(symbol, interval = '1h', limit = 300) {
    const ins = this.instrument(symbol)
    const sec = INTERVALS[interval]
    if (!sec) throw new MockError(400, 'Geçersiz periyot')
    const key = `${symbol}:${interval}`
    if (!this.candles.has(key)) {
      const sigma = Math.min(ins.vol * Math.sqrt(sec) * 0.12, 0.03)
      const nowSec = Math.floor(Date.now() / 1000)
      const lastT = Math.floor(nowSec / sec) * sec
      const closes = [this.last(symbol)]
      for (let i = 1; i < limit; i++) closes.unshift(closes[0] / (1 + gauss() * sigma + sigma * 0.02))
      const bars = closes.map((c, i) => {
        const o = i ? closes[i - 1] : c * (1 - gauss() * sigma * 0.5)
        const h = Math.max(o, c) * (1 + Math.abs(gauss()) * sigma * 0.4)
        const l = Math.min(o, c) * (1 - Math.abs(gauss()) * sigma * 0.4)
        return {
          time: lastT - (limit - 1 - i) * sec,
          open: roundTo(o, ins.tickSize),
          high: roundTo(h, ins.tickSize),
          low: roundTo(l, ins.tickSize),
          close: roundTo(c, ins.tickSize),
          volume: Math.round((0.3 + Math.random()) * 1000 * (ins.market === 'crypto' ? 10 : 100)) / 10,
        }
      })
      this.candles.set(key, bars)
    }
    return this.candles.get(key).slice(-limit)
  }

  orderBook(symbol, depth = 14) {
    const ins = this.instrument(symbol)
    const last = this.last(symbol)
    const step = Math.max(ins.tickSize, roundTo(last * 0.00012, ins.tickSize))
    const baseQty = ins.market === 'crypto' ? 25000 / last : ins.market === 'bist' ? 50000 / last : 100000
    const level = (i, dir) => [roundTo(last + dir * step * (i + 0.5), ins.tickSize), roundTo(baseQty * (0.15 + Math.random() * (0.6 + i * 0.12)), ins.qtyStep) || ins.qtyStep]
    return {
      symbol,
      asks: Array.from({ length: depth }, (_, i) => level(i, 1)),
      bids: Array.from({ length: depth }, (_, i) => level(i, -1)),
      ts: Date.now(),
    }
  }

  recentTrades(symbol) {
    if (!this.trades.has(symbol)) {
      const arr = []
      for (let i = 0; i < 25; i++) arr.push(this.fakeTrade(symbol, Date.now() - i * 2500))
      this.trades.set(symbol, arr)
    }
    return this.trades.get(symbol)
  }
  fakeTrade(symbol, ts = Date.now()) {
    const ins = this.instruments.get(symbol)
    const last = this.last(symbol)
    const baseQty = ins.market === 'crypto' ? 3000 / last : ins.market === 'bist' ? 20000 / last : 50000
    return {
      id: uid('tr'),
      price: roundTo(last * (1 + gauss() * 0.0001), ins.tickSize),
      qty: roundTo(baseQty * Math.random() * 2, ins.qtyStep) || ins.qtyStep,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      ts,
    }
  }

  // ------------------------------------------------------------------ tick döngüsü
  tick() {
    this.tickCount++
    const nowMs = Date.now()
    // 1) fiyatlar
    for (const [symbol, p] of this.prices) {
      const ins = this.instruments.get(symbol)
      const drift = (ins.price - p.last) / ins.price / 4000 // uzun vadede başlangıca doğru hafif çekim
      p.last = roundTo(Math.max(ins.tickSize, p.last * (1 + gauss() * ins.vol * 0.4 + drift)), ins.tickSize)
      p.high = Math.max(p.high, p.last)
      p.low = Math.min(p.low, p.last)
      p.volume += Math.random() * p.volume * 0.00005
    }
    this.emit('tickers', this.tickers())

    // 2) mumlar
    for (const [key, bars] of this.candles) {
      const [symbol, interval] = [key.slice(0, key.lastIndexOf(':')), key.slice(key.lastIndexOf(':') + 1)]
      const sec = INTERVALS[interval]
      const t = Math.floor(nowMs / 1000 / sec) * sec
      const price = this.last(symbol)
      let bar = bars[bars.length - 1]
      if (bar.time === t) {
        bar.close = price
        bar.high = Math.max(bar.high, price)
        bar.low = Math.min(bar.low, price)
        bar.volume = Math.round((bar.volume + Math.random() * 3) * 10) / 10
      } else {
        bar = { time: t, open: bar.close, high: Math.max(bar.close, price), low: Math.min(bar.close, price), close: price, volume: 1 }
        bars.push(bar)
        if (bars.length > 600) bars.shift()
      }
      if (this.hasListeners(`candles:${key}`)) this.emit(`candles:${key}`, { ...bar })
    }

    // 3) emir defteri / son işlemler (yalnızca dinlenen semboller)
    for (const ch of this.listeners.keys()) {
      if (ch.startsWith('orderbook:')) this.emit(ch, this.orderBook(ch.slice(10)))
      if (ch.startsWith('trades:')) {
        const symbol = ch.slice(7)
        const list = this.recentTrades(symbol)
        const n = 1 + Math.floor(Math.random() * 3)
        const fresh = Array.from({ length: n }, () => this.fakeTrade(symbol))
        list.unshift(...fresh)
        list.length = Math.min(list.length, 40)
        this.emit(ch, fresh)
      }
    }

    // 4) emirler, TP/SL, kurallar, botlar, risk
    this.processOrders()
    this.processProtection()
    this.processRules()
    if (this.tickCount % 3 === 0) this.processBots()
    this.processRisk()
    if (this.tickCount % 5 === 0) this.emit('portfolio', this.portfolioSummary())
  }

  // ------------------------------------------------------------------ emirler
  placeOrder(body, { internal = false, source = 'manual', silent = false } = {}) {
    const { exchangeId, symbol, side, type = 'market' } = body
    const conn = this.conn(exchangeId)
    const prov = this.provider(conn)
    const ins = this.instrument(symbol)
    const risk = this.db.risk
    const last = this.last(symbol)

    if (!['buy', 'sell'].includes(side)) throw new MockError(400, 'Geçersiz yön')
    if (!internal) {
      if (risk.killSwitch.active) throw new MockError(423, 'Acil durdurma aktif: yeni emir girilemez', 'KILL_SWITCH')
      if (conn.paused) throw new MockError(409, `${conn.label} hesabında işlemler duraklatıldı`, 'EXCHANGE_PAUSED')
      for (const guard of this.tradeGuards) guard({ conn, provider: prov, instrument: ins, side, type, body })
    }
    if (conn.status !== 'connected') throw new MockError(409, `${conn.label} bağlantısı aktif değil`, 'EXCHANGE_DOWN')
    if (conn.market !== ins.market && conn.provider !== 'custom_rest') throw new MockError(400, `${prov.name} bu piyasayı (${ins.symbol}) desteklemiyor`)

    const qty = roundTo(+body.qty, ins.qtyStep)
    if (!(qty > 0)) throw new MockError(400, `Miktar en az ${ins.qtyStep} olmalı`)
    const num = (v) => (v === null || v === undefined || v === '' ? null : +v)
    const price = num(body.price)
    const stopPrice = num(body.stopPrice)
    const trailingPct = num(body.trailingPct)
    const leverage = prov.features.futures && conn.permissions?.includes('futures') ? Math.min(Math.max(Math.round(num(body.leverage) || 1), 1), 20) : 1

    switch (type) {
      case 'market':
        break
      case 'limit':
        if (!(price > 0)) throw new MockError(400, 'Limit fiyatı gerekli')
        break
      case 'stop_market':
        if (!(stopPrice > 0)) throw new MockError(400, 'Stop fiyatı gerekli')
        if (side === 'sell' ? stopPrice >= last : stopPrice <= last)
          throw new MockError(400, side === 'sell' ? 'Satış stop fiyatı güncel fiyatın altında olmalı' : 'Alış stop fiyatı güncel fiyatın üstünde olmalı')
        break
      case 'stop_limit':
        if (!(price > 0 && stopPrice > 0)) throw new MockError(400, 'Stop ve limit fiyatları gerekli')
        break
      case 'trailing_stop':
        if (!prov.features.trailing) throw new MockError(400, `${prov.name} iz süren stop desteklemiyor`)
        if (!(trailingPct >= 0.1 && trailingPct <= 50)) throw new MockError(400, 'İz mesafesi %0,1 – %50 arasında olmalı')
        break
      case 'oco':
        if (!prov.features.oco) throw new MockError(400, `${prov.name} OCO emri desteklemiyor`)
        if (!(price > 0 && stopPrice > 0)) throw new MockError(400, 'OCO için kâr-al ve stop fiyatları gerekli')
        if (side === 'sell' && !(price > last && stopPrice < last)) throw new MockError(400, 'Satış OCO: kâr-al fiyatı > güncel fiyat > stop fiyatı olmalı')
        if (side === 'buy' && !(price < last && stopPrice > last)) throw new MockError(400, 'Alış OCO: limit fiyatı < güncel fiyat < stop fiyatı olmalı')
        break
      default:
        throw new MockError(400, 'Desteklenmeyen emir tipi')
    }

    const pos = this.db.positions.find((p) => p.exchangeId === exchangeId && p.symbol === symbol)
    if (!internal) {
      const openCount = this.db.orders.filter((o) => o.status === 'open').length
      if (type !== 'market' && openCount >= risk.maxOpenOrders) throw new MockError(429, `Açık emir limiti (${risk.maxOpenOrders}) doldu`, 'RISK_LIMIT')

      const refPrice = price || stopPrice || last
      const reducing = pos && ((pos.side === 'long' && side === 'sell') || (pos.side === 'short' && side === 'buy'))
      const openingQty = reducing ? Math.max(0, qty - pos.qty) : qty
      if (openingQty > 0) {
        if (side === 'sell' && !prov.features.short) throw new MockError(400, 'Satılacak yeterli pozisyon yok (bu hesap açığa satışı desteklemiyor)')
        const marginQuote = (openingQty * refPrice) / leverage
        const marginUsd = this.toUsd(marginQuote, ins.quote)
        const total = this.totalValueUsd()
        if (marginUsd > (total * risk.maxPositionPct) / 100)
          throw new MockError(422, `Risk limiti: emir tutarı portföy sınırını (%${risk.maxPositionPct}) aşıyor`, 'RISK_LIMIT')
        const free = this.cash(conn).free - this.lockedCash(conn)
        if (this.convert(marginQuote * 1.001, ins.quote, this.accountCcy(conn)) > free + 1e-9)
          throw new MockError(422, 'Yetersiz bakiye', 'INSUFFICIENT_FUNDS')
      }
    }

    const order = {
      id: uid('od'), exchangeId, symbol, side, type, qty, price, stopPrice, trailingPct, leverage,
      takeProfit: num(body.takeProfit), stopLoss: num(body.stopLoss),
      status: 'open', filledQty: 0, avgPrice: null, source, reason: null, createdAt: Date.now(),
      ref: type === 'trailing_stop' ? last : undefined, triggered: false,
    }
    this.db.orders.unshift(order)

    if (type === 'market') this.fill(order, last * (1 + (side === 'buy' ? 1 : -1) * 0.0002), { silent: true })
    else if (type === 'limit' && (side === 'buy' ? last <= price : last >= price)) this.fill(order, last, { silent: true })
    else if (!silent) {
      this.log('info', source, `${symbol} ${fmtQty(qty)} ${TYPE_TR[type]} ${SIDE_TR[side]} emri girildi${price ? ` @ ${fmtNum(price)}` : ''}${stopPrice ? ` (stop ${fmtNum(stopPrice)})` : ''}${trailingPct ? ` (%${trailingPct})` : ''}`, { exchangeId, symbol })
    }
    if (order.status === 'rejected') throw new MockError(422, order.reason || 'Emir reddedildi')

    this.emit('orders', order)
    this.save()
    return order
  }

  lockedCash(conn) {
    let locked = 0
    for (const o of this.db.orders) {
      if (o.status !== 'open' || o.exchangeId !== conn.id || o.side !== 'buy') continue
      const pos = this.db.positions.find((p) => p.exchangeId === conn.id && p.symbol === o.symbol && p.side === 'short')
      if (pos) continue
      const ins = this.instruments.get(o.symbol)
      const px = o.price || o.stopPrice || this.last(o.symbol)
      locked += this.convert((o.qty * px) / (o.leverage || 1), ins.quote, this.accountCcy(conn))
    }
    return locked
  }

  /** Emri px fiyatından gerçekleştirir; pozisyon ve bakiyeyi günceller */
  fill(order, px, { silent = false } = {}) {
    const conn = this.conn(order.exchangeId)
    const prov = this.provider(conn)
    const ins = this.instrument(order.symbol)
    const acct = this.accountCcy(conn)
    const cash = this.cash(conn)
    px = roundTo(px, ins.tickSize)
    const dir = order.side === 'buy' ? 1 : -1
    let qtyLeft = order.qty
    let cashDeltaQuote = 0
    let realized = 0
    const fee = order.qty * px * 0.001

    let pos = this.db.positions.find((p) => p.exchangeId === order.exchangeId && p.symbol === order.symbol)
    if (pos && ((pos.side === 'long' && dir === -1) || (pos.side === 'short' && dir === 1))) {
      const closeQty = Math.min(pos.qty, qtyLeft)
      const posDir = pos.side === 'long' ? 1 : -1
      const pnl = (px - pos.entryPrice) * closeQty * posDir
      const released = (pos.margin * closeQty) / pos.qty
      cashDeltaQuote += released + pnl
      realized += pnl
      pos.qty = roundTo(pos.qty - closeQty, ins.qtyStep)
      pos.margin -= released
      qtyLeft = roundTo(qtyLeft - closeQty, ins.qtyStep)
      if (pos.qty <= 0) {
        this.db.positions = this.db.positions.filter((p) => p !== pos)
        pos = null
      }
    }
    if (qtyLeft > 0) {
      if (dir === -1 && !prov.features.short) {
        if (realized === 0 && cashDeltaQuote === 0) return this.reject(order, 'Satılacak yeterli pozisyon yok', silent)
        order.qty = roundTo(order.qty - qtyLeft, ins.qtyStep) // satılabilecek kadarını sat
        qtyLeft = 0
      } else {
        const lev = order.leverage || 1
        const margin = (qtyLeft * px) / lev
        const available = cash.free + this.convert(cashDeltaQuote - fee, ins.quote, acct)
        if (this.convert(margin, ins.quote, acct) > available + 1e-9) return this.reject(order, 'Yetersiz bakiye', silent)
        if (pos) {
          pos.entryPrice = (pos.entryPrice * pos.qty + px * qtyLeft) / (pos.qty + qtyLeft)
          pos.qty = roundTo(pos.qty + qtyLeft, ins.qtyStep)
          pos.margin += margin
        } else {
          pos = {
            id: uid('ps'), exchangeId: order.exchangeId, symbol: order.symbol, side: dir === 1 ? 'long' : 'short',
            qty: qtyLeft, entryPrice: px, leverage: lev, margin, stopLoss: null, takeProfit: null, openedAt: Date.now(),
          }
          this.db.positions.push(pos)
        }
        cashDeltaQuote -= margin
      }
    }
    cashDeltaQuote -= fee
    cash.free += this.convert(cashDeltaQuote, ins.quote, acct)

    if (pos && (order.takeProfit || order.stopLoss)) {
      if (order.takeProfit) pos.takeProfit = order.takeProfit
      if (order.stopLoss) pos.stopLoss = order.stopLoss
    }
    Object.assign(order, { status: 'filled', filledQty: order.qty, avgPrice: px, filledAt: Date.now(), fee, realizedPnl: realized || null })
    const pnlTxt = realized ? ` · K/Z ${realized > 0 ? '+' : ''}${fmtNum(realized, 2)} ${ins.quote}` : ''
    this.log(
      order.source === 'manual' && order.type === 'market' ? 'info' : 'success',
      order.source,
      `${order.symbol} ${fmtQty(order.qty)} ${SIDE_TR[order.side]} gerçekleşti @ ${fmtNum(px)}${pnlTxt}`,
      { exchangeId: order.exchangeId, symbol: order.symbol },
      !silent,
    )
    this.emit('orders', order)
    this.emit('positions', null)
    this.emit('balances', null)
    this.save()
    return true
  }

  reject(order, reason, silent) {
    Object.assign(order, { status: 'rejected', reason })
    this.log('danger', order.source, `${order.symbol} ${SIDE_TR[order.side]} emri reddedildi: ${reason}`, { exchangeId: order.exchangeId, symbol: order.symbol }, !silent)
    this.emit('orders', order)
    this.save()
    return false
  }

  cancelOrder(id, source = 'manual') {
    const o = this.db.orders.find((x) => x.id === id)
    if (!o) throw new MockError(404, 'Emir bulunamadı')
    if (o.status !== 'open') throw new MockError(409, 'Sadece açık emirler iptal edilebilir')
    Object.assign(o, { status: 'canceled', canceledAt: Date.now() })
    this.log('info', source, `${o.symbol} ${SIDE_TR[o.side]} emri iptal edildi`, { exchangeId: o.exchangeId, symbol: o.symbol })
    this.emit('orders', o)
    this.save()
    return o
  }

  cancelAll({ exchangeId, symbol } = {}, source = 'manual') {
    const list = this.db.orders.filter((o) => o.status === 'open' && (!exchangeId || o.exchangeId === exchangeId) && (!symbol || o.symbol === symbol))
    list.forEach((o) => Object.assign(o, { status: 'canceled', canceledAt: Date.now() }))
    if (list.length) this.log('warning', source, `${list.length} açık emir toplu iptal edildi`)
    this.emit('orders', null)
    this.save()
    return { canceled: list.length }
  }

  processOrders() {
    for (const o of this.db.orders) {
      if (o.status !== 'open') continue
      const p = this.last(o.symbol)
      const buy = o.side === 'buy'
      try {
        switch (o.type) {
          case 'limit':
            if (buy ? p <= o.price : p >= o.price) this.fill(o, o.price)
            break
          case 'stop_market':
            if (buy ? p >= o.stopPrice : p <= o.stopPrice) this.fill(o, p)
            break
          case 'stop_limit':
            if (!o.triggered && (buy ? p >= o.stopPrice : p <= o.stopPrice)) {
              o.triggered = true
              this.log('info', o.source, `${o.symbol} stop-limit tetiklendi, limit emir aktif @ ${fmtNum(o.price)}`, { symbol: o.symbol })
            }
            if (o.triggered && (buy ? p <= o.price : p >= o.price)) this.fill(o, o.price)
            break
          case 'trailing_stop':
            if (buy) {
              o.ref = Math.min(o.ref ?? p, p)
              if (p >= o.ref * (1 + o.trailingPct / 100)) this.fill(o, p)
            } else {
              o.ref = Math.max(o.ref ?? p, p)
              if (p <= o.ref * (1 - o.trailingPct / 100)) this.fill(o, p)
            }
            break
          case 'oco':
            if (buy ? p <= o.price : p >= o.price) this.fill(o, o.price)
            else if (buy ? p >= o.stopPrice : p <= o.stopPrice) this.fill(o, p)
            break
          default:
            break
        }
      } catch (e) {
        o.status = 'rejected'
        o.reason = e.message
      }
    }
  }

  // ------------------------------------------------------------------ pozisyonlar
  closePosition(id, percent = 100, source = 'manual') {
    const pos = this.db.positions.find((p) => p.id === id)
    if (!pos) throw new MockError(404, 'Pozisyon bulunamadı')
    const ins = this.instrument(pos.symbol)
    const pct = Math.min(Math.max(+percent || 100, 1), 100)
    const qty = pct === 100 ? pos.qty : roundTo((pos.qty * pct) / 100, ins.qtyStep)
    if (!(qty > 0)) throw new MockError(400, 'Kapatılacak miktar çok küçük')
    return this.placeOrder({ exchangeId: pos.exchangeId, symbol: pos.symbol, side: pos.side === 'long' ? 'sell' : 'buy', type: 'market', qty }, { internal: true, source })
  }

  updatePosition(id, { stopLoss, takeProfit }) {
    const pos = this.db.positions.find((p) => p.id === id)
    if (!pos) throw new MockError(404, 'Pozisyon bulunamadı')
    const last = this.last(pos.symbol)
    const sl = stopLoss === '' || stopLoss === undefined ? null : stopLoss === null ? null : +stopLoss
    const tp = takeProfit === '' || takeProfit === undefined ? null : takeProfit === null ? null : +takeProfit
    const long = pos.side === 'long'
    if (sl !== null && (long ? sl >= last : sl <= last)) throw new MockError(400, long ? 'Zarar-kes fiyatı güncel fiyatın altında olmalı' : 'Zarar-kes fiyatı güncel fiyatın üstünde olmalı')
    if (tp !== null && (long ? tp <= last : tp >= last)) throw new MockError(400, long ? 'Kâr-al fiyatı güncel fiyatın üstünde olmalı' : 'Kâr-al fiyatı güncel fiyatın altında olmalı')
    pos.stopLoss = sl
    pos.takeProfit = tp
    this.log('info', 'manual', `${pos.symbol} pozisyonu güncellendi · SL ${sl ? fmtNum(sl) : '–'} · TP ${tp ? fmtNum(tp) : '–'}`, { exchangeId: pos.exchangeId, symbol: pos.symbol })
    this.emit('positions', null)
    this.save()
    return pos
  }

  processProtection() {
    for (const pos of [...this.db.positions]) {
      const p = this.last(pos.symbol)
      const long = pos.side === 'long'
      let reason = null
      if (pos.stopLoss && (long ? p <= pos.stopLoss : p >= pos.stopLoss)) reason = 'Zarar-kes'
      else if (pos.takeProfit && (long ? p >= pos.takeProfit : p <= pos.takeProfit)) reason = 'Kâr-al'
      if (!reason) continue
      try {
        this.log('warning', 'system', `${pos.symbol} ${reason} tetiklendi @ ${fmtNum(p)} – pozisyon kapatılıyor`, { exchangeId: pos.exchangeId, symbol: pos.symbol }, true)
        this.closePosition(pos.id, 100, 'system')
      } catch (e) {
        pos.stopLoss = null
        pos.takeProfit = null
        this.log('danger', 'system', `${pos.symbol} ${reason} çalıştırılamadı: ${e.message}`, {}, true)
      }
    }
  }

  // ------------------------------------------------------------------ kurallar
  ruleCondition(r) {
    const t = r.trigger
    if (t.type === 'portfolio_drawdown') return this.dayPnlPct() <= t.value
    if (!r.symbol || !this.prices.has(r.symbol)) return null
    const tk = this.ticker(r.symbol)
    switch (t.type) {
      case 'price_above':
        return tk.last >= t.value
      case 'price_below':
        return tk.last <= t.value
      case 'change_above':
        return tk.changePct >= t.value
      case 'change_below':
        return tk.changePct <= t.value
      case 'position_pnl_below': {
        const pos = this.db.positions.find((p) => p.symbol === r.symbol && (!r.exchangeId || p.exchangeId === r.exchangeId))
        return pos ? this.positionMetrics(pos).pnlPct <= t.value : null
      }
      default:
        return null
    }
  }

  processRules() {
    for (const r of this.db.rules) {
      if (!r.enabled) continue
      const cond = this.ruleCondition(r)
      if (cond === null) continue
      const armed = this.ruleArmed.has(r.id) ? this.ruleArmed.get(r.id) : true
      if (!cond) {
        this.ruleArmed.set(r.id, true)
        continue
      }
      if (!armed) continue
      if (r.lastTriggeredAt && r.cooldownSec && Date.now() - r.lastTriggeredAt < r.cooldownSec * 1000) continue
      this.ruleArmed.set(r.id, false)
      this.runRule(r)
    }
  }

  runRule(r) {
    r.triggerCount = (r.triggerCount || 0) + 1
    r.lastTriggeredAt = Date.now()
    if (r.repeat === 'once') r.enabled = false
    const a = r.action
    const tag = { exchangeId: r.exchangeId, symbol: r.symbol, ruleId: r.id }
    try {
      const tradeAction = ['market_buy', 'market_sell', 'close_position'].includes(a.type)
      if (tradeAction && this.db.risk.killSwitch.active) throw new Error('acil durdurma aktif olduğu için işlem yapılmadı')
      switch (a.type) {
        case 'notify':
          this.log('warning', 'rule', `${r.name}: koşul gerçekleşti (${r.symbol || 'portföy'} ${this.ruleConditionText(r)})`, tag, true)
          break
        case 'market_buy':
          this.placeOrder({ exchangeId: r.exchangeId, symbol: r.symbol, side: 'buy', type: 'market', qty: a.qty }, { source: 'rule', silent: true })
          this.log('success', 'rule', `${r.name}: ${fmtQty(a.qty)} ${r.symbol} alındı`, tag, true)
          break
        case 'market_sell':
        case 'close_position': {
          const pos = this.db.positions.find((p) => p.symbol === r.symbol && p.exchangeId === r.exchangeId)
          if (!pos) throw new Error('kapatılacak pozisyon bulunamadı')
          const pct = a.type === 'close_position' ? 100 : a.percent ?? Math.min(100, ((a.qty || 0) / pos.qty) * 100)
          this.closePosition(pos.id, pct, 'rule')
          this.log('success', 'rule', `${r.name}: ${r.symbol} pozisyonunun %${Math.round(pct)}'i kapatıldı`, tag, true)
          break
        }
        case 'cancel_orders':
          this.cancelAll({ exchangeId: r.exchangeId || undefined, symbol: r.symbol || undefined }, 'rule')
          this.log('warning', 'rule', `${r.name}: açık emirler iptal edildi`, tag, true)
          break
        case 'pause_exchange':
          this.updateConnection(r.exchangeId, { paused: true }, 'rule')
          break
        case 'kill_switch':
          this.setKillSwitch({ active: true, reason: `Kural: ${r.name}`, cancelOrders: true }, 'rule')
          break
        default:
          break
      }
    } catch (e) {
      this.log('danger', 'rule', `${r.name} çalıştırılamadı: ${e.message}`, tag, true)
    }
    this.emit('rules', r)
    this.save()
  }

  ruleConditionText(r) {
    const v = r.trigger.value
    return {
      price_above: `≥ ${fmtNum(v)}`,
      price_below: `≤ ${fmtNum(v)}`,
      change_above: `24s değişim ≥ %${v}`,
      change_below: `24s değişim ≤ %${v}`,
      position_pnl_below: `pozisyon K/Z ≤ %${v}`,
      portfolio_drawdown: `günlük K/Z ≤ %${v}`,
    }[r.trigger.type]
  }

  validateRule(body) {
    const types = ['price_above', 'price_below', 'change_above', 'change_below', 'position_pnl_below', 'portfolio_drawdown']
    const actions = ['notify', 'market_buy', 'market_sell', 'close_position', 'cancel_orders', 'pause_exchange', 'kill_switch']
    if (!body.name?.trim()) throw new MockError(400, 'Kural adı gerekli')
    if (!types.includes(body.trigger?.type)) throw new MockError(400, 'Geçersiz koşul tipi')
    if (body.trigger.value === '' || Number.isNaN(+body.trigger.value)) throw new MockError(400, 'Koşul değeri gerekli')
    if (!actions.includes(body.action?.type)) throw new MockError(400, 'Geçersiz aksiyon')
    if (body.trigger.type !== 'portfolio_drawdown' && !body.symbol) throw new MockError(400, 'Sembol seçin')
    if (['market_buy', 'market_sell', 'close_position', 'pause_exchange'].includes(body.action.type) && !body.exchangeId) throw new MockError(400, 'Borsa hesabı seçin')
    if (body.action.type === 'market_buy' && !(+body.action.qty > 0)) throw new MockError(400, 'Alış miktarı gerekli')
    if (body.action.type === 'market_sell' && !(+body.action.percent > 0 || +body.action.qty > 0)) throw new MockError(400, 'Satış oranı veya miktarı gerekli')
  }

  // ------------------------------------------------------------------ botlar
  processBots() {
    for (const b of this.db.bots) {
      if (b.status !== 'running') continue
      b.pnl = Math.round((b.pnl + gauss() * b.investment * 0.0004 + b.investment * 0.00005) * 100) / 100
      if (this.tickCount % 30 === 0) {
        b.pnlHistory.push(b.pnl)
        if (b.pnlHistory.length > 60) b.pnlHistory.shift()
      }
      if (Math.random() < 0.02) {
        b.trades++
        const ins = this.instruments.get(b.symbol)
        const side = b.strategy === 'dca' || Math.random() > 0.5 ? 'buy' : 'sell'
        const qty = roundTo((b.config.amount || b.investment / (b.config.grids || 10)) / this.last(b.symbol), ins.qtyStep) || ins.qtyStep
        this.log('info', 'bot', `${b.name}: ${fmtQty(qty)} ${ins.base} ${SIDE_TR[side]} @ ${fmtNum(this.last(b.symbol))}`, { exchangeId: b.exchangeId, symbol: b.symbol, botId: b.id })
      }
    }
    if (this.db.bots.some((b) => b.status === 'running')) this.emit('bots', null)
  }

  validateBot(body) {
    if (!body.name?.trim()) throw new MockError(400, 'Bot adı gerekli')
    if (!['dca', 'grid', 'trailing'].includes(body.strategy)) throw new MockError(400, 'Geçersiz strateji')
    const conn = this.conn(body.exchangeId)
    const ins = this.instrument(body.symbol)
    if (conn.market !== ins.market) throw new MockError(400, 'Seçilen hesap bu sembolü desteklemiyor')
    if (!(+body.investment > 0)) throw new MockError(400, 'Yatırım tutarı gerekli')
    const c = body.config || {}
    if (body.strategy === 'grid') {
      if (!(+c.lower > 0 && +c.upper > +c.lower)) throw new MockError(400, 'Grid: üst fiyat alt fiyattan büyük olmalı')
      if (!(+c.grids >= 2 && +c.grids <= 200)) throw new MockError(400, 'Grid sayısı 2–200 arasında olmalı')
    }
    if (body.strategy === 'dca' && !(+c.amount > 0 && +c.intervalHours > 0)) throw new MockError(400, 'DCA: alım tutarı ve aralığı gerekli')
    if (body.strategy === 'trailing' && !(+c.trailingPct > 0)) throw new MockError(400, 'İz mesafesi gerekli')
    const free = this.cash(conn).free
    if (this.convert(+body.investment, ins.quote, this.accountCcy(conn)) > free) throw new MockError(422, 'Bot için yetersiz bakiye')
  }

  setBotStatus(id, status) {
    const b = this.db.bots.find((x) => x.id === id)
    if (!b) throw new MockError(404, 'Bot bulunamadı')
    if (status === 'running' && this.db.risk.killSwitch.active) throw new MockError(423, 'Acil durdurma aktifken bot başlatılamaz', 'KILL_SWITCH')
    if (status === 'running') {
      const conn = this.conn(b.exchangeId)
      if (conn.status !== 'connected' || conn.paused) throw new MockError(409, `${conn.label} hesabı aktif değil`)
    }
    b.status = status
    if (status === 'running' && !b.startedAt) b.startedAt = Date.now()
    const tr = { running: 'başlatıldı', paused: 'duraklatıldı', stopped: 'durduruldu' }[status]
    this.log(status === 'running' ? 'success' : 'warning', 'bot', `${b.name} ${tr}`, { botId: b.id, symbol: b.symbol, exchangeId: b.exchangeId })
    this.emit('bots', b)
    this.save()
    return b
  }

  // ------------------------------------------------------------------ risk
  dayPnl() {
    return this.totalValueUsd() - this.db.dayStartValue
  }
  dayPnlPct() {
    return (this.dayPnl() / this.db.dayStartValue) * 100
  }

  processRisk() {
    const r = this.db.risk
    if (r.killSwitch.active || !r.dailyLossLimit.enabled) return
    if (this.dayPnlPct() <= -Math.abs(r.dailyLossLimit.pct)) {
      this.setKillSwitch({ active: true, reason: `Günlük zarar limiti (%${r.dailyLossLimit.pct}) aşıldı`, cancelOrders: true }, 'risk')
    }
  }

  riskState() {
    const total = this.totalValueUsd()
    const pct = this.dayPnlPct()
    return {
      ...this.db.risk,
      state: {
        totalValue: total,
        dayStartValue: this.db.dayStartValue,
        dayPnl: total - this.db.dayStartValue,
        dayPnlPct: pct,
        lossLimitUsedPct: this.db.risk.dailyLossLimit.enabled && pct < 0 ? Math.min(100, (-pct / this.db.risk.dailyLossLimit.pct) * 100) : 0,
        openOrders: this.db.orders.filter((o) => o.status === 'open').length,
        runningBots: this.db.bots.filter((b) => b.status === 'running').length,
        activeRules: this.db.rules.filter((x) => x.enabled).length,
      },
    }
  }

  updateRisk(patch) {
    const r = this.db.risk
    if (patch.dailyLossLimit) {
      const pct = +patch.dailyLossLimit.pct
      if (!(pct > 0 && pct <= 100)) throw new MockError(400, 'Günlük zarar limiti %0–100 arasında olmalı')
      r.dailyLossLimit = { enabled: !!patch.dailyLossLimit.enabled, pct }
    }
    if (patch.maxPositionPct !== undefined) {
      if (!(+patch.maxPositionPct > 0 && +patch.maxPositionPct <= 100)) throw new MockError(400, 'Maks. pozisyon oranı %1–100 olmalı')
      r.maxPositionPct = +patch.maxPositionPct
    }
    if (patch.maxOpenOrders !== undefined) {
      if (!(+patch.maxOpenOrders >= 1 && +patch.maxOpenOrders <= 500)) throw new MockError(400, 'Maks. açık emir 1–500 olmalı')
      r.maxOpenOrders = Math.round(+patch.maxOpenOrders)
    }
    if (patch.requireConfirm !== undefined) r.requireConfirm = !!patch.requireConfirm
    this.log('info', 'risk', 'Risk ayarları güncellendi')
    this.emit('risk', null)
    this.save()
    return this.riskState()
  }

  setKillSwitch({ active, reason, cancelOrders = false, closePositions = false }, source = 'manual') {
    const r = this.db.risk
    if (active) {
      r.killSwitch = { active: true, reason: reason || 'Manuel durdurma', at: Date.now(), by: source }
      let paused = 0
      this.db.bots.forEach((b) => {
        if (b.status === 'running') {
          b.status = 'paused'
          b.pausedByKillSwitch = true
          paused++
        }
      })
      const canceled = cancelOrders ? this.cancelAll({}, source).canceled : 0
      let closed = 0
      if (closePositions) {
        for (const p of [...this.db.positions]) {
          try {
            this.closePosition(p.id, 100, source)
            closed++
          } catch {
            /* bağlantısı olmayan hesap – atla */
          }
        }
      }
      this.log('danger', 'risk', `ACİL DURDURMA: ${r.killSwitch.reason} · ${paused} bot duraklatıldı · ${canceled} emir iptal · ${closed} pozisyon kapatıldı`, {}, true)
    } else {
      r.killSwitch = { active: false, reason: null, at: null, by: null }
      this.db.dayStartValue = Math.min(this.db.dayStartValue, this.totalValueUsd() * 1.0001)
      this.log('success', 'risk', 'İşlemler yeniden etkinleştirildi', {}, true)
    }
    this.emit('risk', null)
    this.emit('bots', null)
    this.save()
    return this.riskState()
  }

  // ------------------------------------------------------------------ bağlantılar
  validateCredentials(provider, credentials = {}) {
    for (const f of provider.fields) {
      if (!String(credentials[f.key] || '').trim()) throw new MockError(400, `${f.label} gerekli`)
    }
    const key = String(credentials.apiKey || credentials.accountId || '')
    return key.length >= 8 && !key.toLowerCase().includes('fail')
  }

  createConnection({ provider: providerId, label, credentials, testnet = false }) {
    const prov = this.providers.get(providerId)
    if (!prov) throw new MockError(400, 'Desteklenmeyen platform')
    for (const guard of this.connectionGuards) guard({ provider: prov })
    if (!label?.trim()) throw new MockError(400, 'Hesap adı gerekli')
    const valid = this.validateCredentials(prov, credentials)
    if (!valid) throw new MockError(400, 'Bağlantı testi başarısız: API anahtarı doğrulanamadı', 'AUTH_FAILED')
    const key = String(credentials.apiKey || credentials.accountId)
    const c = {
      id: uid('cx'), provider: prov.id, label: label.trim(), market: prov.market, status: 'connected', paused: false, testnet: !!testnet,
      apiKeyMasked: `${key.slice(0, 4)}••••••••${key.slice(-4)}`, permissions: ['read', prov.features.futures ? 'futures' : 'spot'],
      latencyMs: 30 + Math.round(Math.random() * 80), lastSyncAt: Date.now(), createdAt: Date.now(), credentialsValid: true,
    }
    this.db.connections.push(c)
    const demoCash = { crypto: 10000, bist: 250000, forex: 10000 }[prov.market]
    this.db.balances.push({ exchangeId: c.id, asset: this.accountCcy(c), free: demoCash })
    this.log('success', 'system', `${prov.name} hesabı bağlandı: ${c.label}`, { exchangeId: c.id }, true)
    this.emit('exchanges', c)
    this.emit('balances', null)
    this.save()
    return c
  }

  testConnection(id) {
    const c = this.conn(id)
    if (!c.credentialsValid) {
      c.status = 'error'
      c.errorMessage = '401 Unauthorized – API anahtarı geçersiz veya süresi dolmuş'
      this.emit('exchanges', c)
      this.save()
      return { ok: false, message: c.errorMessage }
    }
    Object.assign(c, { status: 'connected', errorMessage: null, latencyMs: 30 + Math.round(Math.random() * 80), lastSyncAt: Date.now() })
    this.emit('exchanges', c)
    this.save()
    return { ok: true, latencyMs: c.latencyMs, permissions: c.permissions }
  }

  updateConnection(id, patch, source = 'manual') {
    const c = this.conn(id)
    if (patch.label !== undefined) {
      if (!patch.label.trim()) throw new MockError(400, 'Hesap adı boş olamaz')
      c.label = patch.label.trim()
    }
    if (patch.credentials) {
      const prov = this.provider(c)
      c.credentialsValid = this.validateCredentials(prov, patch.credentials)
      const key = String(patch.credentials.apiKey || patch.credentials.accountId)
      c.apiKeyMasked = `${key.slice(0, 4)}••••••••${key.slice(-4)}`
      this.testConnection(id)
      this.log(c.credentialsValid ? 'success' : 'danger', source, `${c.label} API anahtarları güncellendi${c.credentialsValid ? '' : ' (doğrulama başarısız)'}`, { exchangeId: id }, true)
    }
    if (patch.paused !== undefined && patch.paused !== c.paused) {
      c.paused = !!patch.paused
      if (c.paused) {
        this.db.bots.forEach((b) => b.exchangeId === id && b.status === 'running' && (b.status = 'paused'))
        this.emit('bots', null)
      }
      this.log(c.paused ? 'warning' : 'success', source === 'manual' ? 'risk' : source, `${c.label} hesabında işlemler ${c.paused ? 'duraklatıldı' : 'yeniden açıldı'}`, { exchangeId: id }, source !== 'manual')
    }
    this.emit('exchanges', c)
    this.save()
    return c
  }

  deleteConnection(id) {
    const c = this.conn(id)
    if (this.db.positions.some((p) => p.exchangeId === id)) throw new MockError(409, 'Bu hesapta açık pozisyonlar var. Önce pozisyonları kapatın.')
    this.db.connections = this.db.connections.filter((x) => x.id !== id)
    this.db.orders.forEach((o) => o.exchangeId === id && o.status === 'open' && Object.assign(o, { status: 'canceled', canceledAt: Date.now() }))
    this.db.balances = this.db.balances.filter((b) => b.exchangeId !== id)
    this.db.bots.forEach((b) => b.exchangeId === id && (b.status = 'stopped'))
    this.log('warning', 'system', `${c.label} bağlantısı kaldırıldı`, {})
    ;['exchanges', 'orders', 'balances', 'bots'].forEach((ch) => this.emit(ch, null))
    this.save()
    return { ok: true }
  }

  // ------------------------------------------------------------------ portföy
  balancesView() {
    return this.db.balances.map((b) => {
      const conn = this.db.connections.find((c) => c.id === b.exchangeId)
      const locked = conn ? this.lockedCash(conn) : 0
      return { ...b, locked, total: b.free, available: Math.max(0, b.free - locked), valueUsd: this.toUsd(b.free, b.asset) }
    })
  }

  portfolioSummary() {
    const allocation = { crypto: 0, bist: 0, forex: 0, cash: 0 }
    const byExchange = {}
    let unrealized = 0
    for (const b of this.db.balances) {
      const v = this.toUsd(b.free, b.asset)
      allocation.cash += v
      byExchange[b.exchangeId] = (byExchange[b.exchangeId] || 0) + v
    }
    for (const p of this.db.positions) {
      const ins = this.instrument(p.symbol)
      const m = this.positionMetrics(p)
      const v = this.toUsd(m.value, ins.quote)
      allocation[ins.market] += v
      byExchange[p.exchangeId] = (byExchange[p.exchangeId] || 0) + v
      unrealized += this.toUsd(m.pnl, ins.quote)
    }
    const total = Object.values(allocation).reduce((a, b) => a + b, 0)
    return {
      baseCurrency: 'USD',
      totalValue: total,
      cashValue: allocation.cash,
      positionsValue: total - allocation.cash,
      unrealizedPnl: unrealized,
      dayPnl: total - this.db.dayStartValue,
      dayPnlPct: ((total - this.db.dayStartValue) / this.db.dayStartValue) * 100,
      allocation: [
        { key: 'crypto', label: 'Kripto', value: allocation.crypto },
        { key: 'bist', label: 'BIST', value: allocation.bist },
        { key: 'forex', label: 'Forex', value: allocation.forex },
        { key: 'cash', label: 'Nakit', value: allocation.cash },
      ],
      byExchange: Object.entries(byExchange).map(([exchangeId, value]) => ({ exchangeId, value })),
      ts: Date.now(),
    }
  }

  portfolioHistory(range = '1M') {
    const cfg = { '1D': [96, 900], '1W': [168, 3600], '1M': [180, 14400], '3M': [90, 86400], '1Y': [365, 86400] }[range]
    if (!cfg) throw new MockError(400, 'Geçersiz aralık')
    const [n, step] = cfg
    const total = this.totalValueUsd()
    let cached = this.historyCache.get(range)
    if (!cached || Date.now() - cached.at > 10 * 60_000) {
      const vals = [total]
      const sigma = range === '1D' ? 0.0012 : range === '1W' ? 0.0022 : range === '1M' ? 0.003 : 0.007
      for (let i = 1; i < n; i++) vals.unshift(vals[0] / (1 + gauss() * sigma + sigma * 0.06))
      const end = Math.floor(Date.now() / 1000)
      cached = { at: Date.now(), points: vals.map((v, i) => [(end - (n - 1 - i) * step) * 1000, v]) }
      this.historyCache.set(range, cached)
    }
    cached.points[cached.points.length - 1] = [Date.now(), total]
    return { range, points: cached.points }
  }
}

const TYPE_TR = { market: 'piyasa', limit: 'limit', stop_market: 'stop-piyasa', stop_limit: 'stop-limit', trailing_stop: 'iz süren stop', oco: 'OCO' }

// HMR sırasında birden fazla motor oluşmasın
export const engine = globalThis.__tnMockEngine || (globalThis.__tnMockEngine = new MockEngine())
