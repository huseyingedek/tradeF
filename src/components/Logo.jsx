/**
 * Tradepilo logosu – navigasyon oku + altın uçuş izi ("trading on autopilot")
 * Harici görsel yok; her boyutta keskin SVG.
 */
export default function Logo({ size = 46, showText = true, textClass = 'brand-text' }) {
  return (
    <>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="32" cy="32" r="30" fill="#fff" />
        <path d="M14 48 Q22 46 26 40" fill="none" stroke="#ffc542" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.5 6" />
        <path d="M48 16 L22 27 L33 31 L37 42 Z" fill="#40189d" stroke="#40189d" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      {showText && <span className={textClass}>Tradepilo</span>}
    </>
  )
}
