import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'

export default function NotFound() {
  return (
    <div className="error-page">
      <div>
        <div className="code">404</div>
        <h2 className="mb-2">Sayfa bulunamadı</h2>
        <p className="text-muted mb-4">Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.</p>
        <Link to="/dashboard" className="btn btn-primary px-4">
          <FiArrowLeft /> Panele dön
        </Link>
      </div>
    </div>
  )
}
