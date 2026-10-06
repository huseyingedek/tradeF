import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import EmptyState from '../EmptyState'
import { ExchangeTag, SideBadge, SourceBadge, StatusBadge } from '../Badges'
import { useCancelOrder, useLookups } from '../../api/queries'
import { useApp } from '../../context/AppContext'
import { fmtDateTime, fmtMoney, fmtNum, fmtQty, pnlClass } from '../../utils/format'
import { ORDER_TYPE_LABEL } from '../../utils/trading'

const priceText = (o) => {
  switch (o.type) {
    case 'market':
      return 'Piyasa'
    case 'stop_market':
      return `Stop ${fmtNum(o.stopPrice)}`
    case 'stop_limit':
      return `${fmtNum(o.price)} (stop ${fmtNum(o.stopPrice)})`
    case 'trailing_stop':
      return `İz %${o.trailingPct}`
    case 'oco':
      return `TP ${fmtNum(o.price)} / SL ${fmtNum(o.stopPrice)}`
    default:
      return fmtNum(o.price)
  }
}

export default function OrdersTable({ orders = [], history = false, compact = false, emptyText }) {
  const lk = useLookups()
  const cancel = useCancelOrder()
  const { confirm } = useApp()

  if (!orders.length) return <EmptyState title={history ? 'Emir geçmişi boş' : 'Açık emir yok'} text={emptyText} />

  const onCancel = async (o) => {
    const ok = await confirm({ title: 'Emri iptal et', message: `${o.symbol} ${fmtQty(o.qty)} ${ORDER_TYPE_LABEL[o.type]} ${o.side === 'buy' ? 'alış' : 'satış'} emri iptal edilsin mi?`, confirmText: 'İptal Et', variant: 'danger' })
    if (ok) cancel.mutate(o.id)
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover table-trading">
        <thead>
          <tr>
            <th className="ps-4">Tarih</th>
            <th>Sembol</th>
            {!compact && <th>Hesap</th>}
            <th>Tip</th>
            <th>Yön</th>
            <th className="text-end">Fiyat</th>
            <th className="text-end">Miktar</th>
            {history && <th className="text-end">Ort. Fiyat</th>}
            {history && <th className="text-end">K/Z</th>}
            <th>Durum</th>
            {!compact && <th>Kaynak</th>}
            {!history && <th className="pe-4 text-end">İşlem</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const quote = lk.instrument[o.symbol]?.quote
            return (
              <tr key={o.id}>
                <td className="ps-4 text-muted fs-13 text-nowrap">{fmtDateTime(o.filledAt || o.canceledAt || o.createdAt)}</td>
                <td><Link className="fw-semibold text-body" to={`/trade?symbol=${encodeURIComponent(o.symbol)}&ex=${o.exchangeId}`}>{o.symbol}</Link></td>
                {!compact && <td><ExchangeTag exchange={lk.exchange[o.exchangeId]} /></td>}
                <td className="text-nowrap">{ORDER_TYPE_LABEL[o.type]}</td>
                <td><SideBadge side={o.side} /></td>
                <td className="text-end num text-nowrap">{priceText(o)}</td>
                <td className="text-end num">{fmtQty(o.qty)}</td>
                {history && <td className="text-end num">{o.avgPrice ? fmtNum(o.avgPrice) : '–'}</td>}
                {history && <td className={`text-end num ${pnlClass(o.realizedPnl)}`}>{o.realizedPnl ? fmtMoney(o.realizedPnl, quote) : '–'}</td>}
                <td>
                  <StatusBadge status={o.status} />
                  {o.reason && <div className="fs-12 text-down mt-1">{o.reason}</div>}
                </td>
                {!compact && <td><SourceBadge source={o.source} /></td>}
                {!history && (
                  <td className="pe-4 text-end">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onCancel(o)} disabled={cancel.isPending}><FiX /> İptal</button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
