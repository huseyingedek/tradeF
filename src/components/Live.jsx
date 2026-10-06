import { useEffect, useRef, useState } from 'react'
import { useTicker } from '../hooks/useMarket'
import { fmtPct, fmtPrice, pnlClass } from '../utils/format'

/** Değiştiğinde yeşil/kırmızı yanıp sönen fiyat */
export function FlashNumber({ value, children, className = '' }) {
  const prev = useRef(value)
  const [flash, setFlash] = useState('')
  useEffect(() => {
    if (value === undefined || prev.current === undefined) {
      prev.current = value
      return
    }
    if (value !== prev.current) {
      setFlash(value > prev.current ? 'flash-up' : 'flash-down')
      prev.current = value
      const t = setTimeout(() => setFlash(''), 600)
      return () => clearTimeout(t)
    }
  }, [value])
  return <span className={`${className} ${flash}`}>{children}</span>
}

export function LivePrice({ symbol, decimals, className = '' }) {
  const t = useTicker(symbol)
  if (!t) return <span className={`text-muted ${className}`}>–</span>
  return (
    <FlashNumber value={t.last} className={`num ${className}`}>
      {fmtPrice(t.last, decimals)}
    </FlashNumber>
  )
}

export function LiveChange({ symbol, className = '' }) {
  const t = useTicker(symbol)
  if (!t) return <span className="text-muted">–</span>
  return <span className={`num ${pnlClass(t.changePct)} ${className}`}>{fmtPct(t.changePct)}</span>
}

export function Pct({ value, className = '' }) {
  return <span className={`num ${pnlClass(value)} ${className}`}>{fmtPct(value)}</span>
}
