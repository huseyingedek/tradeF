import { useEffect } from 'react'
import { FiX } from 'react-icons/fi'

/** Bootstrap JS gerektirmeyen modal */
export default function Modal({ title, onClose, children, footer, size = '', onSubmit }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const Body = onSubmit ? 'form' : 'div'
  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
          <Body
            className="modal-content hn-modal"
            onSubmit={onSubmit ? (e) => { e.preventDefault(); onSubmit(e) } : undefined}
            noValidate
          >
            <div className="modal-header border-0 px-4 pt-4 pb-2">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn btn-sm btn-soft ms-auto" onClick={onClose} aria-label="Kapat"><FiX /></button>
            </div>
            <div className="modal-body px-4">{children}</div>
            {footer && <div className="modal-footer border-0 px-4 pb-4">{footer}</div>}
          </Body>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  )
}
