import { useState } from 'react'
import { FiChevronDown, FiChevronUp, FiExternalLink, FiHelpCircle } from 'react-icons/fi'
import { API_KEY_GUIDES } from '../../data/apiKeyGuides'

// **kalın** işaretlerini <strong>'a çevirir
const rich = (text) => text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part))

/** Kapalı başlar; kullanıcı isterse açıp adımları okur */
export default function ApiKeyGuide({ provider }) {
  const [open, setOpen] = useState(false)
  const guide = API_KEY_GUIDES[provider?.id]
  if (!guide) return null
  return (
    <div className="api-guide mb-3">
      <button type="button" className="api-guide-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FiHelpCircle /> {provider.name} için bu anahtarları nasıl alırım? {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {open && (
        <div className="api-guide-body">
          <ol className="mb-2">
            {guide.steps.map((s, i) => <li key={i}>{rich(s)}</li>)}
          </ol>
          {guide.url && (
            <a href={guide.url} target="_blank" rel="noopener noreferrer" className="fs-13 d-inline-flex align-items-center gap-1">
              {guide.urlLabel} <FiExternalLink />
            </a>
          )}
          <div className="fs-12 text-muted mt-1">Menü adları borsanın güncellemelerine göre küçük farklılıklar gösterebilir.</div>
        </div>
      )}
    </div>
  )
}
