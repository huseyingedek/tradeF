export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  const items = Array.from({ length: pages }, (_, i) => i + 1)
  return (
    <ul className="pagination mb-0 flex-wrap">
      <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
        <button className="page-link" onClick={() => onChange(page - 1)}>‹</button>
      </li>
      {items.map((n) => (
        <li key={n} className={`page-item ${n === page ? 'active' : ''}`}>
          <button className="page-link" onClick={() => onChange(n)}>{n}</button>
        </li>
      ))}
      <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
        <button className="page-link" onClick={() => onChange(page + 1)}>›</button>
      </li>
    </ul>
  )
}
