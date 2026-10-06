export default function StatCard({ label, value, sub, variant = 'purple', icon: Icon }) {
  return (
    <div className={`stat-card ${variant}`}>
      {Icon && <div className="stat-icon"><Icon /></div>}
      <div className="ms-auto">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}
