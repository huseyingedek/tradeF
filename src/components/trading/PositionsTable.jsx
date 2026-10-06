import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiEdit2, FiX } from 'react-icons/fi'
import Dropdown from '../Dropdown'
import EmptyState from '../EmptyState'
import PositionEditModal from './PositionEditModal'
import { ExchangeTag, SideBadge } from '../Badges'
import { FlashNumber } from '../Live'
import { useClosePosition, useLookups } from '../../api/queries'
import { useTickerVersion, tickerStore } from '../../hooks/useMarket'
import { useApp } from '../../context/AppContext'
import { fmtMoney, fmtNum, fmtPct, fmtQty, pnlClass } from '../../utils/format'
import { positionLive } from '../../utils/trading'

export default function PositionsTable({ positions = [], compact = false, emptyText }) {
  useTickerVersion() // her fiyat güncellemesinde yeniden çiz
  const lk = useLookups()
  const close = useClosePosition()
  const { confirm, toast } = useApp()
  const [editing, setEditing] = useState(null)

  const doClose = async (p, percent) => {
    const ok = await confirm({
      title: `${p.symbol} pozisyonunu kapat`,
      message: `${lk.exchange[p.exchangeId]?.label} hesabındaki ${fmtQty(p.qty)} ${p.symbol} ${p.side === 'long' ? 'long' : 'short'} pozisyonunun %${percent}'i piyasa fiyatından kapatılacak.`,
      confirmText: `%${percent} Kapat`,
      variant: 'danger',
    })
    if (ok) close.mutate({ id: p.id, percent }, { onSuccess: () => toast(`${p.symbol} pozisyonunun %${percent}'i kapatıldı`) })
  }

  if (!positions.length) return <EmptyState title="Açık pozisyon yok" text={emptyText} />

  return (
    <>
      <div className="table-responsive">
        <table className="table table-hover table-trading">
          <thead>
            <tr>
              <th className="ps-4">Sembol</th>
              {!compact && <th>Hesap</th>}
              <th>Yön</th>
              <th className="text-end">Miktar</th>
              <th className="text-end">Giriş</th>
              <th className="text-end">Güncel</th>
              <th className="text-end">K/Z</th>
              {!compact && <th className="text-end">SL / TP</th>}
              {!compact && <th className="pe-4 text-end">İşlem</th>}
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const ins = lk.instrument[p.symbol]
              const live = positionLive(p, tickerStore.get(p.symbol))
              return (
                <tr key={p.id}>
                  <td className="ps-4">
                    <Link to={`/trade?symbol=${encodeURIComponent(p.symbol)}&ex=${p.exchangeId}`} className="fw-semibold text-body">{p.symbol}</Link>
                    {p.leverage > 1 && <span className="chip yellow ms-2">{p.leverage}x</span>}
                    {compact && <div className="fs-12 text-muted">{lk.exchange[p.exchangeId]?.label}</div>}
                  </td>
                  {!compact && <td><ExchangeTag exchange={lk.exchange[p.exchangeId]} /></td>}
                  <td><SideBadge side={p.side} /></td>
                  <td className="text-end num">{fmtQty(p.qty)}</td>
                  <td className="text-end num">
                    {fmtNum(p.entryPrice)}
                    {p.liquidationPrice && <div className="fs-12 text-down text-nowrap" title="Fiyat bu seviyeye gelirse pozisyon otomatik kapatılır (teminatın %90'ı kaybedilmiş olur)">Tasfiye {fmtNum(p.liquidationPrice)}</div>}
                  </td>
                  <td className="text-end num"><FlashNumber value={live.mark}>{fmtNum(live.mark)}</FlashNumber></td>
                  <td className={`text-end num ${pnlClass(live.pnl)}`}>
                    <div className="fw-semibold text-nowrap">{fmtMoney(live.pnl, ins?.quote)}</div>
                    <div className="fs-12">{fmtPct(live.pnlPct)}</div>
                  </td>
                  {!compact && (
                    <td className="text-end num fs-13">
                      <div className="text-down">{p.stopLoss ? fmtNum(p.stopLoss) : '–'}</div>
                      <div className="text-up">{p.takeProfit ? fmtNum(p.takeProfit) : '–'}</div>
                    </td>
                  )}
                  {!compact && (
                    <td className="pe-4 text-end text-nowrap">
                      <button className="btn btn-sm btn-soft me-1" onClick={() => setEditing(p)} title="SL/TP düzenle"><FiEdit2 /></button>
                      <Dropdown className="d-inline-block" caret={false} toggleClass="btn btn-sm btn-outline-danger" toggle={<><FiX /> Kapat</>}>
                        {[25, 50, 100].map((pct) => (
                          <button key={pct} className="dropdown-item" data-close onClick={() => doClose(p, pct)}>%{pct} kapat</button>
                        ))}
                      </Dropdown>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {editing && <PositionEditModal position={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
