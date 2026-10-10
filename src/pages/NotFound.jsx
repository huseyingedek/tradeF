import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { t } from '../i18n'

export default function NotFound() {
  return (
    <div className="error-page">
      <div>
        <div className="code">404</div>
        <h2 className="mb-2">{t('Sayfa bulunamadı')}</h2>
        <p className="text-muted mb-4">{t('Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.')}</p>
        <Link to="/dashboard" className="btn btn-primary px-4">
          <FiArrowLeft /> {t('Panele dön')}
        </Link>
      </div>
    </div>
  )
}
