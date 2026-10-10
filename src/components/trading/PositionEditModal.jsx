import { useState } from 'react'
import Modal from '../Modal'
import { useUpdatePosition } from '../../api/queries'
import { useTicker } from '../../hooks/useMarket'
import { fmtNum, fmtPct } from '../../utils/format'
import { t as tr } from '../../i18n'

export default function PositionEditModal({ position: p, onClose }) {
  const t = useTicker(p.symbol)
  const update = useUpdatePosition()
  const [sl, setSl] = useState(p.stopLoss ?? '')
  const [tp, setTp] = useState(p.takeProfit ?? '')
  const last = t?.last ?? p.entryPrice
  const long = p.side === 'long'
  const dist = (v) => (v ? fmtPct(((v - last) / last) * 100) : '')

  const setPct = (setter, pct) => setter(+(last * (1 + pct / 100)).toPrecision(6))

  return (
    <Modal
      title={tr('{0} · Zarar-kes / Kâr-al', p.symbol)}
      onClose={onClose}
      onSubmit={() => update.mutate({ id: p.id, stopLoss: sl === '' ? null : +sl, takeProfit: tp === '' ? null : +tp }, { onSuccess: onClose })}
      footer={
        <>
          <button type="button" className="btn btn-soft" onClick={onClose}>{tr('Vazgeç')}</button>
          <button className="btn btn-primary" disabled={update.isPending}>{tr('Kaydet')}</button>
        </>
      }
    >
      <div className="d-flex justify-content-between mb-3 fs-13">
        <span className="text-muted">{tr('Giriş:')} <strong className="text-body num">{fmtNum(p.entryPrice)}</strong></span>
        <span className="text-muted">{tr('Güncel:')} <strong className="text-body num">{fmtNum(last)}</strong></span>
      </div>
      <label className="form-label d-flex justify-content-between">{tr('Zarar-kes (Stop Loss)')} <small className="text-muted">{dist(+sl)}</small></label>
      <input type="number" step="any" className="form-control mb-2" value={sl} onChange={(e) => setSl(e.target.value)} placeholder={long ? tr('Güncel fiyatın altında') : tr('Güncel fiyatın üstünde')} />
      <div className="d-flex gap-1 mb-3">
        {(long ? [-2, -5, -10] : [2, 5, 10]).map((x) => (
          <button type="button" key={x} className="btn btn-sm btn-soft" onClick={() => setPct(setSl, x)}>{x > 0 ? '+' : ''}{x}%</button>
        ))}
        <button type="button" className="btn btn-sm btn-soft ms-auto" onClick={() => setSl('')}>{tr('Kaldır')}</button>
      </div>
      <label className="form-label d-flex justify-content-between">{tr('Kâr-al (Take Profit)')} <small className="text-muted">{dist(+tp)}</small></label>
      <input type="number" step="any" className="form-control mb-2" value={tp} onChange={(e) => setTp(e.target.value)} placeholder={long ? tr('Güncel fiyatın üstünde') : tr('Güncel fiyatın altında')} />
      <div className="d-flex gap-1">
        {(long ? [3, 5, 10] : [-3, -5, -10]).map((x) => (
          <button type="button" key={x} className="btn btn-sm btn-soft" onClick={() => setPct(setTp, x)}>{x > 0 ? '+' : ''}{x}%</button>
        ))}
        <button type="button" className="btn btn-sm btn-soft ms-auto" onClick={() => setTp('')}>{tr('Kaldır')}</button>
      </div>
    </Modal>
  )
}
