// İstemci tarafı canlı hesaplamalar
export function positionLive(p, ticker) {
  const mark = ticker?.last ?? p.entryPrice
  const dir = p.side === 'long' ? 1 : -1
  const margin = p.margin ?? (p.qty * p.entryPrice) / (p.leverage || 1)
  // kayıp teminatı aşamaz (backend ile aynı – tasfiye)
  const pnl = Math.max((mark - p.entryPrice) * p.qty * dir, -margin)
  return { mark, pnl, pnlPct: margin ? (pnl / margin) * 100 : 0, value: margin + pnl, notional: p.qty * mark, margin }
}

export const ORDER_TYPE_LABEL = {
  market: 'Piyasa',
  limit: 'Limit',
  stop_market: 'Stop-Piyasa',
  stop_limit: 'Stop-Limit',
  trailing_stop: 'İz Süren Stop',
  oco: 'OCO',
}

/** Kural koşulunu okunur cümleye çevirir */
export function describeRule(r, exchangeLabel) {
  const v = r.trigger?.value
  const s = r.symbol || 'Portföy'
  const cond = {
    price_above: `${s} fiyatı ${v} üzerine çıkarsa`,
    price_below: `${s} fiyatı ${v} altına düşerse`,
    change_above: `${s} 24s değişimi %${v} üzerine çıkarsa`,
    change_below: `${s} 24s değişimi %${v} altına düşerse`,
    position_pnl_below: `${s} pozisyon K/Z %${v} altına düşerse`,
    portfolio_drawdown: `Günlük portföy K/Z %${v} altına düşerse`,
  }[r.trigger?.type]
  const a = r.action || {}
  const act = {
    notify: 'bildirim gönder',
    market_buy: `${a.qty} adet piyasa fiyatından al`,
    market_sell: a.percent ? `pozisyonun %${a.percent}'ini sat` : `${a.qty} adet sat`,
    close_position: 'pozisyonu tamamen kapat',
    cancel_orders: 'açık emirleri iptal et',
    pause_exchange: `${exchangeLabel || 'hesabı'} duraklat`,
    kill_switch: 'TÜM işlemleri durdur',
  }[a.type]
  return { cond, act }
}
