import { FiCheckCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { t as tr, tServer } from '../i18n'

const icons = { success: FiCheckCircle, danger: FiAlertTriangle, warning: FiAlertTriangle, info: FiInfo }
const colors = { success: '#2bc155', danger: '#f72b50', warning: '#ffb800', info: '#48a9f8' }

export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="hn-toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.variant] || FiInfo
        return (
          <div key={t.id} className={`hn-toast ${t.variant}`}>
            <Icon size={20} color={colors[t.variant]} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{tServer(t.message)}</span>
            <button onClick={() => dismissToast(t.id)} aria-label={tr('Kapat')}>
              <FiX />
            </button>
          </div>
        )
      })}
    </div>
  )
}
