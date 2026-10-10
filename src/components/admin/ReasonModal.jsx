import { useState } from 'react'
import Modal from '../Modal'
import { t } from '../../i18n'

/** Gerekçe isteyen onay penceresi – tüm kritik admin işlemlerinde kullanılır (denetim için) */
export default function ReasonModal({ title, message, confirmText = t('Onayla'), variant = 'danger', minLength = 5, placeholder = t('Gerekçe (denetim günlüğüne yazılır)'), pending, onConfirm, onClose, children }) {
  const [reason, setReason] = useState('')
  const ok = reason.trim().length >= minLength
  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={() => ok && onConfirm(reason.trim())}
      footer={
        <>
          <button type="button" className="btn btn-soft" onClick={onClose}>{t('Vazgeç')}</button>
          <button className={`btn btn-${variant}`} disabled={!ok || pending}>{pending ? t('İşleniyor…') : confirmText}</button>
        </>
      }
    >
      {message && <p className="text-muted">{message}</p>}
      {children}
      <label className="form-label">{t('Gerekçe')}</label>
      <textarea className="form-control" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} autoFocus />
      <div className="form-help mt-1">{ok ? '✓' : t('En az {0} karakter', minLength)}</div>
    </Modal>
  )
}
