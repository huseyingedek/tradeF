import { useMemo } from 'react'
import { useOrderBook, useRecentTrades, useTicker } from '../../hooks/useMarket'
import { fmtNum, fmtQty, fmtTime, pnlClass } from '../../utils/format'
import { FlashNumber } from '../Live'
import { t as i18nT } from '../../i18n'

export function OrderBook({ symbol, onPick, depth = 10 }) {
  const book = useOrderBook(symbol, depth)
  const t = useTicker(symbol)
  const { asks, bids, max } = useMemo(() => {
    if (!book) return { asks: [], bids: [], max: 1 }
    let c = 0
    const bids = book.bids.slice(0, depth).map(([p, q]) => [p, q, (c += q)])
    c = 0
    const asks = book.asks.slice(0, depth).map(([p, q]) => [p, q, (c += q)])
    return { asks: asks.reverse(), bids, max: Math.max(bids.at(-1)?.[2] || 1, asks[0]?.[2] || 1) }
  }, [book, depth])

  const row = (side) => ([p, q, cum]) => (
    <button key={`${side}${p}`} type="button" className={`ob-row ${side}`} onClick={() => onPick?.(p)} title={i18nT('Fiyatı emir formuna aktar')}>
      <span className="ob-bar" style={{ width: `${(cum / max) * 100}%` }} />
      <span className={side === 'ask' ? 'text-down' : 'text-up'}>{fmtNum(p)}</span>
      <span>{fmtQty(q)}</span>
      <span className="text-muted">{fmtQty(cum)}</span>
    </button>
  )

  return (
    <div className="orderbook">
      <div className="ob-head"><span>{i18nT('Fiyat')}</span><span>{i18nT('Miktar')}</span><span>{i18nT('Toplam')}</span></div>
      {asks.map(row('ask'))}
      <div className="ob-mid">
        <FlashNumber value={t?.last} className={`fs-5 fw-bold num ${pnlClass(t?.changePct)}`}>{t ? fmtNum(t.last) : '–'}</FlashNumber>
        {book && asks.length > 0 && bids.length > 0 && <small className="text-muted">{i18nT('Spread')} {fmtNum(asks.at(-1)[0] - bids[0][0])}</small>}
      </div>
      {bids.map(row('bid'))}
      {!book && <div className="text-center text-muted py-4">{i18nT('Yükleniyor…')}</div>}
    </div>
  )
}

export function RecentTrades({ symbol }) {
  const trades = useRecentTrades(symbol, 26)
  return (
    <div className="orderbook">
      <div className="ob-head"><span>{i18nT('Fiyat')}</span><span>{i18nT('Miktar')}</span><span>{i18nT('Saat')}</span></div>
      {trades.map((tr) => (
        <div key={tr.id} className="ob-row static">
          <span className={tr.side === 'buy' ? 'text-up' : 'text-down'}>{fmtNum(tr.price)}</span>
          <span>{fmtQty(tr.qty)}</span>
          <span className="text-muted">{fmtTime(tr.ts)}</span>
        </div>
      ))}
    </div>
  )
}
