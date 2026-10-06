import { useState } from 'react'
import Modal from '../Modal'

/** Gerekçe isteyen onay penceresi – tüm kritik admin işlemlerinde kullanılır (denetim için) */
export default function ReasonModal({ title, message, confirmText = 'Onayla', variant = 'danger', minLength = 5, placeholder = 'Gerekçe (denetim günlüğüne yazılır)', pending, onConfirm, onClose, children }) {
  const [reason, setReason] = useState('')
  const ok = reason.trim().length >= minLength
  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={() => ok && onConfirm(reason.trim())}
      footer={
        <>
          <button type="button" className="btn btn-soft" onClick={onClose}>Vazgeç</button>
          <button className={`btn btn-${variant}`} disabled={!ok || pending}>{pending ? 'İşleniyor…' : confirmText}</button>
        </>
      }
    >
      {message && <p className="text-muted">{message}</p>}
      {children}
      <label className="form-label">Gerekçe</label>
      <textarea className="form-control" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} autoFocus />
      <div className="form-help mt-1">{ok ? '✓' : `En az ${minLength} karakter`}</div>
    </Modal>
  )
}
