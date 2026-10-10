import { t } from '../i18n'
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
  market: t('Piyasa'),
  limit: t('Limit'),
  stop_market: 'Stop-Piyasa',
  stop_limit: 'Stop-Limit',
  trailing_stop: t('İz Süren Stop'),
  oco: 'OCO',
}

/** Kural koşulunu okunur cümleye çevirir */
export function describeRule(r, exchangeLabel) {
  const v = r.trigger?.value
  const s = r.symbol || t('Portföy')
  const cond = {
    price_above: t('{0} fiyatı {1} üzerine çıkarsa', s, v),
    price_below: t('{0} fiyatı {1} altına düşerse', s, v),
    change_above: t('{0} 24s değişimi %{1} üzerine çıkarsa', s, v),
    change_below: t('{0} 24s değişimi %{1} altına düşerse', s, v),
    position_pnl_below: t('{0} pozisyon K/Z %{1} altına düşerse', s, v),
    portfolio_drawdown: t('Günlük portföy K/Z %{0} altına düşerse', v),
  }[r.trigger?.type]
  const a = r.action || {}
  const act = {
    notify: t('bildirim gönder'),
    market_buy: t('{0} adet piyasa fiyatından al', a.qty),
    market_sell: a.percent ? t('pozisyonun %{0}\'ini sat', a.percent) : t('{0} adet sat', a.qty),
    close_position: t('pozisyonu tamamen kapat'),
    cancel_orders: t('açık emirleri iptal et'),
    pause_exchange: t('{0} duraklat', exchangeLabel || t('hesabı')),
    kill_switch: t('TÜM işlemleri durdur'),
  }[a.type]
  return { cond, act }
}
