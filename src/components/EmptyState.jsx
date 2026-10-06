import { FiInbox } from 'react-icons/fi'

export default function EmptyState({ icon: Icon = FiInbox, title = 'Kayıt yok', text, action }) {
  return (
    <div className="text-center py-5 px-3">
      <div className="empty-icon mx-auto mb-3"><Icon /></div>
      <h6 className="mb-1">{title}</h6>
      {text && <p className="text-muted fs-13 mb-3">{text}</p>}
      {action}
    </div>
  )
}
