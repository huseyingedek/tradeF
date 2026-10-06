/** Sekmeli seçim (buton grubu) */
export default function Segmented({ options, value, onChange, size = 'sm', className = '' }) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <button key={v} type="button" role="tab" aria-selected={value === v} className={`btn btn-${size} ${value === v ? 'active' : ''}`} onClick={() => onChange(v)}>
            {l}
          </button>
        )
      })}
    </div>
  )
}
