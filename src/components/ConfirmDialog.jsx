import { useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import Modal from './Modal'
import { useApp } from '../context/AppContext'

/** AppContext.confirm() ile açılan global onay penceresi */
export default function ConfirmDialog() {
  const { confirmState: s, resolveConfirm } = useApp()
  const [typed, setTyped] = useState('')
  if (!s) return null
  const blocked = s.requireText && typed.trim().toUpperCase() !== s.requireText
  const close = (v) => {
    setTyped('')
    resolveConfirm(v)
  }
  return (
    <Modal
      title={s.title}
      onClose={() => close(false)}
      footer={
        <>
          <button className="btn btn-soft" onClick={() => close(false)}>{s.cancelText}</button>
          <button className={`btn btn-${s.variant}`} disabled={blocked} onClick={() => close(true)} autoFocus>{s.confirmText}</button>
        </>
      }
    >
      <div className="d-flex gap-3">
        {s.variant === 'danger' && <FiAlertTriangle size={28} className="text-down flex-shrink-0" />}
        <div className="flex-grow-1">
          {typeof s.message === 'string' ? <p className="mb-0">{s.message}</p> : s.message}
          {s.requireText && (
            <div className="mt-3">
              <label className="form-label">Onaylamak için <strong>{s.requireText}</strong> yazın</label>
              <input className="form-control" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
