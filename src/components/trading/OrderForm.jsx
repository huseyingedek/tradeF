import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiInfo } from 'react-icons/fi'
import { usePlaceOrder, useRisk } from '../../api/queries'
import { useApp } from '../../context/AppContext'
import { useTicker } from '../../hooks/useMarket'
import { fmtMoney, fmtNum, fmtQty, stepDecimals } from '../../utils/format'
import { ORDER_TYPE_LABEL } from '../../utils/trading'
import { t as tr, pctText } from '../../i18n'

const TYPE_HELP = {
  market: tr('Anında, o anki en iyi fiyattan gerçekleşir.'),
  limit: tr('Sadece belirlediğiniz fiyattan veya daha iyisinden gerçekleşir.'),
  stop_market: tr('Fiyat stop seviyesine gelince piyasa emri gönderilir (zarar kesmek için).'),
  stop_limit: tr('Fiyat stop seviyesine gelince limit emir aktif olur.'),
  trailing_stop: tr('Fiyat lehinize gittikçe stop seviyesi onu yüzde mesafeyle takip eder.'),
  oco: tr('Kâr-al ve zarar-kes birlikte girilir; biri gerçekleşince diğeri iptal olur.'),
}

const floorTo = (v, step) => {
  const d = stepDecimals(step)
  return +(Math.floor(v / step + 1e-9) * step).toFixed(d)
}

export default function OrderForm({ instrument: ins, exchange, provider, position, cash, initialSide = 'buy', presetPrice }) {
  const t = useTicker(ins?.symbol)
  const { data: risk } = useRisk()
  const { confirm, toast } = useApp()
  const place = usePlaceOrder()

  const [side, setSide] = useState(initialSide)
  const [type, setType] = useState('limit')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [trailingPct, setTrailingPct] = useState('2')
  const [leverage, setLeverage] = useState(1)
  const [protect, setProtect] = useState(false)
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')

  const last = t?.last
  const pf = provider?.features || {}
  // Vadeli/kaldıraç yalnızca hesap API izni 'futures' içeriyorsa
  const futuresOk = pf.futures && exchange?.permissions?.includes('futures')
  const features = { ...pf, futures: futuresOk, short: pf.short && (futuresOk || exchange?.market === 'forex') }
  const types = Object.keys(ORDER_TYPE_LABEL).filter((k) => (k === 'oco' ? features.oco : k === 'trailing_stop' ? features.trailing : true))

  useEffect(() => setSide(initialSide), [initialSide])
  // sembol değişince formu sıfırla
  useEffect(() => {
    setQty('')
    setPrice('')
    setStopPrice('')
    setTp('')
    setSl('')
  }, [ins?.symbol, exchange?.id])
  useEffect(() => {
    if (presetPrice) {
      setPrice(String(presetPrice))
      if (type === 'market') setType('limit')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetPrice])
  useEffect(() => {
    if (!types.includes(type)) setType('limit')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id])

  const refPrice = +price || +stopPrice || last || 0
  const lev = features.futures ? leverage : 1
  const available = cash?.available ?? 0
  const longQty = position?.side === 'long' ? position.qty : 0
  const shortQty = position?.side === 'short' ? position.qty : 0
  // Borsanın standart komisyonu (sanal hesapta uygulanan; canlıda borsa gerçek tutarı keser)
  const isTaker = type !== 'limit' || (last && (side === 'buy' ? +price >= last : +price <= last))
  const feeRate = (isTaker ? provider?.fees?.taker : provider?.fees?.maker) ?? 0.001
  const maxQty = useMemo(() => {
    if (!ins || !refPrice) return 0
    // teminat (tutar / kaldıraç) + komisyon (tüm tutar üzerinden) kullanılabilir bakiyeyi aşmamalı
    const affordable = available / (refPrice * (1 / lev + feeRate))
    if (side === 'buy') return floorTo(shortQty + affordable, ins.qtyStep)
    return features.short ? floorTo(longQty + affordable, ins.qtyStep) : longQty
  }, [ins, refPrice, side, available, lev, feeRate, longQty, shortQty, features.short])

  const total = (+qty || 0) * refPrice
  const estFee = total * feeRate
  const blocked = risk?.killSwitch?.active ? 'kill' : !exchange ? 'noexchange' : exchange.status !== 'connected' ? 'down' : exchange.paused ? 'paused' : null
  const needsPrice = ['limit', 'stop_limit', 'oco'].includes(type)
  const needsStop = ['stop_market', 'stop_limit', 'oco'].includes(type)
  const canProtect = ['market', 'limit'].includes(type)

  const setPct = (pct) => setQty(String(floorTo((maxQty * pct) / 100, ins.qtyStep)))
  const fillLast = (setter) => last && setter(String(last))

  const submit = async (e) => {
    e.preventDefault()
    if (!(+qty > 0)) return toast(tr('Miktar girin'), 'warning')
    if (needsPrice && !(+price > 0)) return toast(tr('Fiyat girin'), 'warning')
    if (needsStop && !(+stopPrice > 0)) return toast(tr('Stop fiyatı girin'), 'warning')
    const body = {
      exchangeId: exchange.id, symbol: ins.symbol, side, type, qty: +qty,
      price: needsPrice ? +price : undefined,
      stopPrice: needsStop ? +stopPrice : undefined,
      trailingPct: type === 'trailing_stop' ? +trailingPct : undefined,
      leverage: features.futures ? lev : undefined,
      takeProfit: protect && canProtect && tp ? +tp : undefined,
      stopLoss: protect && canProtect && sl ? +sl : undefined,
    }
    if (risk?.requireConfirm) {
      const ok = await confirm({
        title: tr('{0} emrini onayla', side === 'buy' ? tr('Alış') : tr('Satış')),
        variant: side === 'buy' ? 'success' : 'danger',
        confirmText: side === 'buy' ? tr('Alış Emri Gönder') : tr('Satış Emri Gönder'),
        message: (
          <table className="table table-sm mb-0 confirm-table">
            <tbody>
              <tr><td>{tr('Hesap')}</td><td>{exchange.label}</td></tr>
              <tr><td>{tr('Sembol')}</td><td className="fw-semibold">{ins.symbol}</td></tr>
              <tr><td>{tr('Tip')}</td><td>{ORDER_TYPE_LABEL[type]}{lev > 1 ? tr(' · {0}x', lev) : ''}</td></tr>
              <tr><td>{tr('Miktar')}</td><td className="num">{fmtQty(+qty)}</td></tr>
              {needsPrice && <tr><td>{type === 'oco' ? tr('Kâr-al') : tr('Limit')}</td><td className="num">{fmtNum(+price)}</td></tr>}
              {needsStop && <tr><td>{tr('Stop')}</td><td className="num">{fmtNum(+stopPrice)}</td></tr>}
              {type === 'trailing_stop' && <tr><td>{tr('İz mesafesi')}</td><td>{pctText(trailingPct)}</td></tr>}
              {body.takeProfit && <tr><td>TP</td><td className="num text-up">{fmtNum(body.takeProfit)}</td></tr>}
              {body.stopLoss && <tr><td>SL</td><td className="num text-down">{fmtNum(body.stopLoss)}</td></tr>}
              <tr><td>{tr('Tahmini tutar')}</td><td className="num fw-semibold">{fmtMoney(total, ins.quote)}</td></tr>
              <tr><td>{tr('Tahmini komisyon')}</td><td className="num">{fmtMoney(estFee, ins.quote)} ({pctText(fmtNum(feeRate * 100, 2))})</td></tr>
            </tbody>
          </table>
        ),
      })
      if (!ok) return
    }
    place.mutate(body, {
      onSuccess: (o) => {
        toast(o.status === 'filled' ? `${ins.symbol} ${fmtQty(o.qty)} ${side === 'buy' ? tr('alındı') : tr('satıldı')} @ ${fmtNum(o.avgPrice)}` : tr('{0} emir gönderildi', ORDER_TYPE_LABEL[type]))
        setQty('')
      },
    })
  }

  if (!ins) return null

  return (
    <form className="order-form" onSubmit={submit} noValidate>
      <div className="side-switch mb-3">
        <button type="button" className={`buy ${side === 'buy' ? 'active' : ''}`} onClick={() => setSide('buy')}>{tr('Al')}</button>
        <button type="button" className={`sell ${side === 'sell' ? 'active' : ''}`} onClick={() => setSide('sell')}>{tr('Sat')}</button>
      </div>

      {blocked && (
        <div className={`alert ${blocked === 'kill' ? 'alert-danger' : 'alert-warning'} d-flex gap-2 py-2 fs-13`}>
          <FiAlertTriangle className="flex-shrink-0 mt-1" />
          <div>
            {blocked === 'kill' && <>{tr('Acil durdurma aktif.')} <Link to="/risk">{tr('Risk paneli')}</Link></>}
            {blocked === 'noexchange' && <>{tr('Bu piyasa için bağlı hesap yok.')} <Link to="/exchanges">{tr('Borsa bağla')}</Link></>}
            {blocked === 'down' && <>{tr('Hesap bağlantısında sorun var.')} <Link to="/exchanges">{tr('Kontrol et')}</Link></>}
            {blocked === 'paused' && <>{tr('Bu hesapta işlemler duraklatılmış.')} <Link to="/risk">{tr('Aç')}</Link></>}
          </div>
        </div>
      )}

      <label className="form-label">{tr('Emir tipi')}</label>
      <select className="form-select mb-1" value={type} onChange={(e) => setType(e.target.value)}>
        {types.map((k) => <option key={k} value={k}>{ORDER_TYPE_LABEL[k]}</option>)}
      </select>
      <div className="form-help mb-3"><FiInfo /> {TYPE_HELP[type]}</div>

      {features.futures && (
        <div className="mb-3">
          <label className="form-label d-flex justify-content-between">{tr('Kaldıraç')} <span className="text-primary">{leverage}x</span></label>
          <input type="range" className="form-range" min={1} max={20} value={leverage} onChange={(e) => setLeverage(+e.target.value)} />
        </div>
      )}

      {needsStop && (
        <div className="mb-3">
          <label className="form-label">{tr('Stop fiyatı (')}{ins.quote})</label>
          <div className="input-group">
            <input type="number" step="any" className="form-control" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} placeholder={side === 'sell' ? tr('Güncelin altında') : tr('Güncelin üstünde')} />
            <button type="button" className="btn btn-soft" onClick={() => fillLast(setStopPrice)}>{tr('Son')}</button>
          </div>
        </div>
      )}
      {needsPrice && (
        <div className="mb-3">
          <label className="form-label">{type === 'oco' ? tr('Kâr-al / limit fiyatı') : tr('Limit fiyatı')} ({ins.quote})</label>
          <div className="input-group">
            <input type="number" step="any" className="form-control" value={price} onChange={(e) => setPrice(e.target.value)} />
            <button type="button" className="btn btn-soft" onClick={() => fillLast(setPrice)}>{tr('Son')}</button>
          </div>
        </div>
      )}
      {type === 'trailing_stop' && (
        <div className="mb-3">
          <label className="form-label">{tr('İz mesafesi (%)')}</label>
          <input type="number" step="0.1" min="0.1" className="form-control" value={trailingPct} onChange={(e) => setTrailingPct(e.target.value)} />
        </div>
      )}

      <label className="form-label d-flex justify-content-between">
        {tr('Miktar (')}{ins.base})
        <small className="text-muted">{tr('Maks:')} {fmtQty(maxQty)}</small>
      </label>
      <input type="number" step={ins.qtyStep} min={0} className="form-control mb-2" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={tr('Adım {0}', ins.qtyStep)} />
      <div className="d-flex gap-1 mb-3">
        {[25, 50, 75, 100].map((p) => (
          <button type="button" key={p} className="btn btn-sm btn-soft flex-fill px-1" onClick={() => setPct(p)}>{pctText(p)}</button>
        ))}
      </div>

      {canProtect && (
        <div className="protect-box mb-3">
          <div className="form-check mb-0">
            <input id="protect" type="checkbox" className="form-check-input" checked={protect} onChange={(e) => setProtect(e.target.checked)} />
            <label htmlFor="protect" className="form-check-label">{tr('Kâr-al / Zarar-kes ekle')}</label>
          </div>
          {protect && (
            <div className="row g-2 mt-1">
              <div className="col-6">
                <input type="number" step="any" className="form-control form-control-sm" placeholder={tr('TP fiyatı')} value={tp} onChange={(e) => setTp(e.target.value)} />
              </div>
              <div className="col-6">
                <input type="number" step="any" className="form-control form-control-sm" placeholder={tr('SL fiyatı')} value={sl} onChange={(e) => setSl(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="order-summary mb-3">
        <div><span>{tr('Kullanılabilir')}</span><span className="num">{fmtMoney(available, cash?.asset)}</span></div>
        {position && <div><span>{tr('Pozisyon')}</span><span className="num">{position.side === 'long' ? '' : '-'}{fmtQty(position.qty)} {ins.base}</span></div>}
        <div><span>{tr('Tahmini tutar')}</span><span className="num fw-semibold">{fmtMoney(total, ins.quote)}</span></div>
        {lev > 1 && <div><span>{tr('Teminat')}</span><span className="num">{fmtMoney(total / lev, ins.quote)}</span></div>}
        <div title={exchange?.mode === 'live' ? tr('{0} komisyonu borsanın kendisi keser (alışta genelde alınan coinden). Hesap kademenize / BNB indirimine göre farklı olabilir.', provider?.name) : tr('{0} standart oranı – sanal hesapta uygulanır', provider?.name ?? tr('Borsa'))}>
          <span>{tr('Komisyon ~{0}', pctText(fmtNum(feeRate * 100, 2)))}{exchange?.mode === 'live' ? tr(' (borsa keser)') : ''}</span>
          <span className="num">{fmtMoney(estFee, ins.quote)}</span>
        </div>
      </div>

      <button className={`btn w-100 py-3 fw-semibold ${side === 'buy' ? 'btn-success' : 'btn-danger'}`} disabled={!!blocked || place.isPending}>
        {place.isPending ? tr('Gönderiliyor…') : `${ins.base} ${side === 'buy' ? 'Al' : tr('Sat')}`}
      </button>
    </form>
  )
}
