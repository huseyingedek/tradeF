import { useEffect, useRef, useState } from 'react'

// Bootstrap JS'e ihtiyaç duymayan hafif dropdown.
// Menü `position: fixed` ile açılır; böylece tablo gibi taşmayı kesen kapsayıcılarda da görünür.
export default function Dropdown({ toggle, children, caret = true, align = 'end', className = '', menuClass = '', toggleClass = '' }) {
  const [pos, setPos] = useState(null) // null = kapalı
  const ref = useRef(null)
  const btnRef = useRef(null)
  const open = pos !== null

  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const onDoc = (e) => !ref.current?.contains(e.target) && close()
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    const follow = () => setPos(place())
    window.addEventListener('resize', close)
    window.addEventListener('scroll', follow, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', follow, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Menü konumunu tetikleyici butona göre hesapla (sayfa kaydırılınca da takip eder)
  const place = () => {
    const r = btnRef.current.getBoundingClientRect()
    const style = { position: 'fixed', zIndex: 1060 }
    if (window.innerHeight - r.bottom < 320 && r.top > 320) style.bottom = window.innerHeight - r.top + 8
    else style.top = r.bottom + 10
    if (align === 'end') style.right = Math.max(8, window.innerWidth - r.right)
    else style.left = Math.max(8, r.left)
    return style
  }
  const onToggle = () => setPos(open ? null : place())

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <button ref={btnRef} type="button" className={`${caret ? 'dropdown-toggle' : ''} ${toggleClass}`} onClick={onToggle} aria-expanded={open}>
        {toggle}
      </button>
      {open && (
        <div
          className={`dropdown-menu show ${menuClass}`}
          style={{ ...pos, maxWidth: 'calc(100vw - 16px)' }}
          onClick={(e) => e.target.closest('[data-close]') && setPos(null)}
        >
          {children}
        </div>
      )}
    </div>
  )
}
