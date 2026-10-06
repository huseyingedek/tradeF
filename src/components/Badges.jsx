// Küçük durum / etiket bileşenleri
const STATUS = {
  connected: ['green', 'Bağlı'],
  error: ['red', 'Hata'],
  disconnected: ['gray', 'Bağlı değil'],
  paused: ['yellow', 'Duraklatıldı'],
  running: ['green', 'Çalışıyor'],
  stopped: ['gray', 'Durduruldu'],
  open: ['sky', 'Açık'],
  filled: ['green', 'Gerçekleşti'],
  canceled: ['gray', 'İptal'],
  rejected: ['red', 'Reddedildi'],
  partially_filled: ['yellow', 'Kısmi'],
}

export function StatusBadge({ status, label }) {
  const [color, text] = STATUS[status] || ['gray', status]
  return (
    <span className={`chip ${color}`}>
      <span className={`status-dot ${color}`} />
      {label || text}
    </span>
  )
}

export const MARKET_LABEL = { crypto: 'Kripto', bist: 'BIST', forex: 'Forex' }
export function MarketBadge({ market }) {
  const c = { crypto: 'orange', bist: 'red', forex: 'sky' }[market] || 'gray'
  return <span className={`chip ${c}`}>{MARKET_LABEL[market] || market}</span>
}

export const SOURCE_LABEL = { manual: 'Manuel', rule: 'Kural', bot: 'Bot', system: 'Sistem', risk: 'Risk' }
export function SourceBadge({ source }) {
  const c = { manual: 'gray', rule: '', bot: 'sky', system: 'yellow', risk: 'red' }[source] ?? 'gray'
  return <span className={`chip ${c}`}>{SOURCE_LABEL[source] || source}</span>
}

export function SideBadge({ side }) {
  const long = side === 'buy' || side === 'long'
  const text = { buy: 'Alış', sell: 'Satış', long: 'Long', short: 'Short' }[side]
  return <span className={`chip ${long ? 'green' : 'red'}`}>{text}</span>
}

/** Borsa logosu (renkli kare + baş harfler) */
export function ExchangeLogo({ provider, size = 36 }) {
  if (!provider) return <span className="ex-logo" style={{ width: size, height: size }} />
  const initials = provider.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return (
    <span className="ex-logo" style={{ width: size, height: size, background: provider.color, color: provider.textColor, fontSize: size * 0.36 }} title={provider.name}>
      {initials}
    </span>
  )
}

export function ExchangeTag({ exchange }) {
  if (!exchange) return <span className="text-muted">–</span>
  return (
    <span className="d-inline-flex align-items-center gap-2 text-nowrap">
      <ExchangeLogo provider={exchange.providerInfo} size={22} />
      <span>{exchange.label}</span>
    </span>
  )
}
