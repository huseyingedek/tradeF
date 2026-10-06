// =====================================================================
//  GERÇEK ZAMANLI VERİ İSTEMCİSİ (WebSocket)
//
//  Kullanım:  const off = realtime.subscribe('tickers', (data) => ...)
//
//  Kanallar (bkz. docs/API.md):
//    tickers                      → Ticker[] (tüm semboller, her saniye)
//    orderbook:<SYMBOL>           → OrderBook
//    trades:<SYMBOL>              → Trade[] (yeni işlemler)
//    candles:<SYMBOL>:<INTERVAL>  → Candle (son mum)
//    orders | positions | balances | exchanges | rules | bots | risk  → değişiklik bildirimi
//    activity                     → ActivityEntry
//    portfolio                    → PortfolioSummary
//
//  Protokol (gerçek backend):
//    istemci → {"op":"subscribe","channel":"tickers"} / {"op":"unsubscribe",...} / {"op":"ping"}
//    sunucu  → {"channel":"tickers","data":[...]}       / {"op":"pong"}
// =====================================================================
import { config } from './config'
import { tokenStore } from './tokenStore'

class RealtimeClient {
  constructor() {
    this.handlers = new Map()
    this.statusListeners = new Set()
    this.status = config.useMock ? 'mock' : 'idle'
    this.ws = null
    this.retry = 0
    this.engine = null
    this.mockUnsubs = new Map()
    this.heartbeat = null
    this.manualClose = false
  }

  // ---------------------------------------------------------------- durum
  setStatus(s) {
    this.status = s
    this.statusListeners.forEach((fn) => fn(s))
  }
  onStatus(fn) {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  // ---------------------------------------------------------------- abonelik
  subscribe(channel, handler) {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
      this.subscribeRemote(channel)
    }
    this.handlers.get(channel).add(handler)
    return () => {
      const set = this.handlers.get(channel)
      if (!set) return
      set.delete(handler)
      if (!set.size) {
        this.handlers.delete(channel)
        this.unsubscribeRemote(channel)
      }
    }
  }

  dispatch(channel, data) {
    this.handlers.get(channel)?.forEach((fn) => {
      try {
        fn(data)
      } catch (e) {
        console.error('[realtime] handler hatası', channel, e)
      }
    })
  }

  async subscribeRemote(channel) {
    if (config.useMock) {
      if (!this.engine) this.engine = (await import('../mock/engine.js')).engine
      if (!this.handlers.has(channel) || this.mockUnsubs.has(channel)) return
      this.mockUnsubs.set(channel, this.engine.subscribe(channel, (d) => this.dispatch(channel, d)))
      return
    }
    this.connect()
    this.send({ op: 'subscribe', channel })
  }

  unsubscribeRemote(channel) {
    if (config.useMock) {
      this.mockUnsubs.get(channel)?.()
      this.mockUnsubs.delete(channel)
      return
    }
    this.send({ op: 'unsubscribe', channel })
  }

  // ---------------------------------------------------------------- WebSocket
  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  connect() {
    if (config.useMock) return
    if (!config.wsUrl) {
      this.setStatus('disabled')
      return
    }
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return
    this.manualClose = false
    this.setStatus(this.retry ? 'reconnecting' : 'connecting')
    const token = tokenStore.get()
    const url = token ? `${config.wsUrl}${config.wsUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : config.wsUrl
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.retry = 0
      this.setStatus('open')
      for (const channel of this.handlers.keys()) this.send({ op: 'subscribe', channel })
      clearInterval(this.heartbeat)
      this.heartbeat = setInterval(() => this.send({ op: 'ping' }), 25_000)
    }
    ws.onmessage = (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg?.op === 'pong') return
      if (msg?.channel) this.dispatch(msg.channel, msg.data)
    }
    ws.onclose = () => {
      clearInterval(this.heartbeat)
      if (this.manualClose) return this.setStatus('closed')
      this.retry++
      this.setStatus('reconnecting')
      setTimeout(() => this.connect(), Math.min(30_000, 1000 * 2 ** Math.min(this.retry, 5)))
    }
    ws.onerror = () => ws.close()
  }

  disconnect() {
    this.manualClose = true
    this.ws?.close()
  }
}

export const realtime = new RealtimeClient()
