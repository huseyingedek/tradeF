import { getLang, t } from './index'

// Ekrana metin olarak çıkan DOM özellikleri
const ATTRS = ['placeholder', 'title', 'alt', 'aria-label']

const tChild = (c) => (typeof c === 'string' ? t(c) : Array.isArray(c) ? c.map(tChild) : c)

// Türkçede yalnızca "Kelime@@bağlam" anahtarlarının bağlam kısmı atılır
const stripCtx = (c) => (typeof c === 'string' ? (c.includes('@@') ? t(c) : c) : Array.isArray(c) ? c.map(stripCtx) : c)

export function tProps(type, props) {
  if (!props) return props
  if (getLang() === 'tr') {
    const ch = props.children
    if (ch === undefined || (typeof ch !== 'string' && !Array.isArray(ch))) return props
    const next = stripCtx(ch)
    return next === ch || (Array.isArray(ch) && next.every((v, i) => v === ch[i])) ? props : { ...props, children: next }
  }
  let out = props
  const ch = props.children
  if (ch !== undefined && (typeof ch === 'string' || Array.isArray(ch))) {
    const next = tChild(ch)
    if (next !== ch) out = { ...out, children: next }
  }
  if (typeof type === 'string') {
    for (const a of ATTRS) {
      const v = props[a]
      if (typeof v === 'string') {
        const n = t(v)
        if (n !== v) {
          if (out === props) out = { ...props }
          out[a] = n
        }
      }
    }
  }
  return out
}
