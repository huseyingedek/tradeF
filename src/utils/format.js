// Sayı / para / zaman biçimlendirme yardımcıları (tr-TR)

const CURRENCY_SYMBOL = { USD: '$', USDT: '$', USDC: '$', TRY: '₺', EUR: '€', GBP: '£' }
export const currencySymbol = (c) => CURRENCY_SYMBOL[c] ?? ''

const nf = new Map()
const getNf = (min, max) => {
  const key = `${min}-${max}`
  if (!nf.has(key)) nf.set(key, new Intl.NumberFormat('tr-TR', { minimumFractionDigits: min, maximumFractionDigits: max }))
  return nf.get(key)
}

/** Fiyat: büyüklüğe göre ondalık sayısını otomatik seçer */
export function autoDecimals(v) {
  const a = Math.abs(v)
  if (a >= 1000) return 2
  if (a >= 10) return 2
  if (a >= 1) return 4
  if (a >= 0.01) return 5
  return 8
}

export function fmtNum(v, decimals) {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  const d = decimals ?? autoDecimals(v)
  return getNf(d, d).format(v)
}

export function fmtPrice(v, decimals) {
  return fmtNum(v, decimals)
}

export function fmtQty(v) {
  if (v === null || v === undefined) return '–'
  const a = Math.abs(v)
  return getNf(0, a >= 100 ? 2 : a >= 1 ? 4 : 8).format(v)
}

export function fmtMoney(v, currency = 'USD', decimals = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  const sym = currencySymbol(currency)
  const s = getNf(decimals, decimals).format(Math.abs(v))
  const sign = v < 0 ? '-' : ''
  return sym ? `${sign}${sym}${s}` : `${sign}${s} ${currency}`
}

export function fmtSignedMoney(v, currency = 'USD') {
  if (v === null || v === undefined) return '–'
  return `${v > 0 ? '+' : ''}${fmtMoney(v, currency)}`
}

export function fmtPct(v, decimals = 2, signed = true) {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  return `${signed && v > 0 ? '+' : ''}${getNf(decimals, decimals).format(v)}%`
}

/** Kısa sayı: 412 bin, 2,75 Mn, 1,2 Mr */
export function fmtCompact(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '–'
  const a = Math.abs(v)
  const f = (x) => getNf(0, x >= 100 ? 0 : x >= 10 ? 1 : 2).format(x)
  if (a >= 1e9) return `${f(v / 1e9)} Mr`
  if (a >= 1e6) return `${f(v / 1e6)} Mn`
  if (a >= 1e4) return `${f(v / 1e3)} bin`
  return getNf(0, 0).format(v)
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return `${s} sn önce`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} dk önce`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} sa önce`
  return `${Math.round(h / 24)} gün önce`
}

export function duration(fromTs) {
  const m = Math.max(0, Math.round((Date.now() - fromTs) / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  if (d) return `${d}g ${h}s`
  if (h) return `${h}s ${mm}dk`
  return `${mm}dk`
}

export const pnlClass = (v) => (v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-muted')
