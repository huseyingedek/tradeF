import { LANGUAGES, getLang, setLang } from '../i18n'

/** Dil seçimi – seçim tarayıcıda saklanır, uygulama yeni dilde yeniden çizilir */
export default function LanguageSelect({ className = 'form-select', compact = false }) {
  return (
    <select className={className} value={getLang()} onChange={(e) => setLang(e.target.value)} aria-label="Dil / Language" style={compact ? { width: 'auto' } : undefined}>
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  )
}
