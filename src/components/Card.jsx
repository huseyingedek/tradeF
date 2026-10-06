export default function Card({ title, actions, children, className = '', bodyClass = '' }) {
  return (
    <div className={`hn-card ${className}`}>
      {(title || actions) && (
        <div className="hn-card-header">
          {typeof title === 'string' ? <h4>{title}</h4> : title}
          {actions}
        </div>
      )}
      <div className={`hn-card-body ${bodyClass}`}>{children}</div>
    </div>
  )
}
