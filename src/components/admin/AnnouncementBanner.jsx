import { FiInfo, FiAlertTriangle, FiTool } from 'react-icons/fi'
import { t } from '../../i18n'

export const LEVELS = {
  info: { label: t('Bilgi'), icon: FiInfo, cls: 'info' },
  warning: { label: t('Uyarı'), icon: FiAlertTriangle, cls: 'warning' },
  maintenance: { label: t('Bakım'), icon: FiTool, cls: 'maintenance' },
}

/** Duyuru şeridi – hem kullanıcı panelinde hem admin önizlemede kullanılır */
export default function AnnouncementBanner({ a, onDismiss }) {
  const L = LEVELS[a.level] || LEVELS.info
  return (
    <div className={`announce ${L.cls}`}>
      <L.icon className="flex-shrink-0 mt-1" />
      <div className="flex-grow-1">
        <strong>{a.title}</strong> <span>{a.message}</span>
      </div>
      {onDismiss && <button className="btn btn-sm p-0 border-0 text-reset" onClick={onDismiss} aria-label={t('Kapat')}>✕</button>}
    </div>
  )
}

