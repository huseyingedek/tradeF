import { FiLock } from 'react-icons/fi'
import { useCan } from '../../api/adminQueries'
import EmptyState from '../EmptyState'
import { t } from '../../i18n'

/** Sayfa düzeyinde izin kontrolü (asıl kontrol backend'dedir) */
export default function RequirePerm({ perm, children }) {
  const can = useCan()
  if (can(perm)) return children
  return (
    <div className="hn-card">
      <EmptyState icon={FiLock} title={t('Bu sayfaya erişim yetkiniz yok')} text={t('Rolünüz bu bölümü kapsamıyor. Süper admin ile iletişime geçin.')} />
    </div>
  )
}
