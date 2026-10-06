import { useId } from 'react'

export default function Switch({ checked, onChange, label, id, disabled, className = '' }) {
  const auto = useId()
  const _id = id || auto
  return (
    <div className={`form-check form-switch mb-0 ${className}`}>
      <input id={_id} className="form-check-input" type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label && <label className="form-check-label" htmlFor={_id}>{label}</label>}
    </div>
  )
}
