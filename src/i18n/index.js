// =====================================================================
//  ÇOK DİLLİ ARAYÜZ (i18n)
//  • Kaynak dil Türkçe: metinler kodda Türkçe yazılır, sözlükler Türkçe → hedef dil.
//  • Çeviri JSX seviyesinde otomatik yapılır (bkz. jsx-runtime.js): ekrana basılan her metin
//    ve placeholder/title/alt/aria-label özellikleri sözlükten geçer.
//  • Değişken içeren metinler ("{0} bot · {1} kural", sunucu hata mesajları) kalıp
//    eşleştirmesiyle çevrilir: kalıplar locales/*.json içinde "{0}" yer tutucularıyla durur.
//  • Admin paneli (/admin/...) Türkçe kalır.
// =====================================================================

export const LANGUAGES = [
  { code: 'tr', label: 'Türkçe', locale: 'tr-TR', flag: '🇹🇷' },
  { code: 'en', label: 'English', locale: 'en-US', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE', flag: '🇩🇪' },
  { code: 'nl', label: 'Nederlands', locale: 'nl-NL', flag: '🇳🇱' },
  { code: 'pt', label: 'Português', locale: 'pt-PT', flag: '🇵🇹' },
  { code: 'az', label: 'Azərbaycan', locale: 'az-Latn-AZ', flag: '🇦🇿' },
]
const CODES = LANGUAGES.map((l) => l.code)
const STORAGE_KEY = 'tn-lang'

const plain = (m) => m.default || m
// İngilizce: ana sözlük + eski düz sözlükler (en.json / server-en.json)
const loadEn = () =>
  Promise.all([import('./server-en.json'), import('./en.json'), import('./locales/en.json')]).then((mods) =>
    Object.assign({}, ...mods.map(plain)),
  )
// Diğer diller: önce İngilizce (eksik metinler Türkçe yerine İngilizce görünsün), üstüne hedef dil
const withEn = (load) => () => Promise.all([loadEn(), load()]).then(([en, d]) => ({ ...en, ...plain(d) }))
const loaders = {
  en: loadEn,
  de: withEn(() => import('./locales/de.json')),
  nl: withEn(() => import('./locales/nl.json')),
  pt: withEn(() => import('./locales/pt.json')),
  az: withEn(() => import('./locales/az.json')),
}

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (CODES.includes(saved)) return saved
  } catch {
    /* depolama yok */
  }
  const nav = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'tr'
  const c = nav.slice(0, 2).toLowerCase()
  return CODES.includes(c) ? c : 'en'
}

let lang = initialLang()
/** Geçerli BCP-47 yerel ayarı (toLocaleUpperCase, tarih biçimleri vb. için; canlı bağlama) */
let locale = LANGUAGES.find((l) => l.code === lang)?.locale || 'tr-TR'
export { lang, locale }
let exact = new Map() // "Kaynak metin" → çeviri
let patterns = [] // [{ re, out }]
const cache = new Map()
const listeners = new Set()
let loaded = false // initI18n tamamlandı mı
let suppress = 0 // >0 iken çeviri yapılmaz (admin paneli)

export const getLang = () => lang
export const getLocale = () => LANGUAGES.find((l) => l.code === lang)?.locale || 'tr-TR'
export const onLangChange = (fn) => (listeners.add(fn), () => listeners.delete(fn))

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function compile(dict) {
  exact = new Map()
  patterns = []
  cache.clear()
  for (const [src, dst] of Object.entries(dict || {})) {
    if (!dst || typeof dst !== 'string') continue
    if (/\{\d+\}/.test(src)) {
      // "{0} bot · {1} kural" → /^(.+?) bot · (.+?) kural$/
      const order = []
      const re = new RegExp('^' + esc(src).replace(/\\\{(\d+)\\\}/g, (_, n) => (order.push(+n), '([\\s\\S]*?)')) + '$')
      patterns.push({ re, order, out: dst, len: src.length })
    } else exact.set(src, dst)
  }
  // uzun (daha özgül) kalıplar önce denenir
  patterns.sort((a, b) => b.len - a.len)
}

export async function setLang(code) {
  if (!CODES.includes(code)) return
  if (code !== 'tr') {
    compile(await loaders[code]())
  } else compile({})
  lang = code
  locale = LANGUAGES.find((l) => l.code === code)?.locale || 'tr-TR'
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* depolama yok */
  }
  document.documentElement.lang = code
  listeners.forEach((fn) => fn(code))
}

/** Uygulama açılırken kaydedilmiş dili yükle (render'dan önce çağrılır) */
export async function initI18n() {
  const code = lang
  lang = 'tr'
  await setLang(code).catch(() => setLang('tr'))
  loaded = true
}

/** Tek bir metni çevir (ön/son boşluklar korunur). Bilinmeyen metin olduğu gibi döner. */
export function t(input, ...args) {
  if (typeof input !== 'string') return input
  let s = input
  // t('{0} bot', n)  veya  t('{0} bot', [n])
  const vars = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
  if (vars.length) s = s.replace(/\{(\d+)\}/g, (m, i) => (vars[i] ?? m))
  // "İşlem@@menü": aynı Türkçe kelimenin farklı anlamları için bağlamlı anahtar
  const at = s.indexOf('@@')
  if (at >= 0) {
    // sözlük henüz yüklenmediyse (modül seviyesinde çağrı, ör. menu.js) anahtarı koru; ekrana basılırken çevrilir
    if (!loaded) return s
    const base = s.slice(0, at)
    if (lang === 'tr' || suppress > 0 || isAdminArea()) return base
    return exact.get(s) ?? translate(base)
  }
  if (lang === 'tr' || suppress > 0 || isAdminArea()) return s
  return translate(s)
}

function translate(s) {
  const trimmed = s.trim()
  if (!trimmed || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(trimmed)) return s
  const hit = cache.get(s)
  if (hit !== undefined) return hit
  let out = exact.get(trimmed)
  if (out === undefined) {
    for (const p of patterns) {
      const m = p.re.exec(trimmed)
      if (!m) continue
      const vals = []
      p.order.forEach((n, i) => (vals[n] = m[i + 1]))
      // değişkenin kendisi de çevrilebilir bir metin olabilir ("Kripto" gibi)
      out = p.out.replace(/\{(\d+)\}/g, (_, n) => translateInner(vals[n] ?? ''))
      break
    }
  }
  const res = out === undefined ? s : s.slice(0, s.indexOf(trimmed)) + out + s.slice(s.indexOf(trimmed) + trimmed.length)
  if (cache.size > 20000) cache.clear()
  cache.set(s, res)
  return res
}
const translateInner = (v) => exact.get(v.trim()) ?? v

/** Sunucudan gelen (Türkçe) mesajları çevir; metin değilse olduğu gibi döner */
export const tServer = (msg) => (typeof msg === 'string' ? t(msg) : msg)

/** Yüzde gösterimi: Türkçe "%5", diğer diller "5%" */
export const pctText = (v) => (lang === 'tr' || lang === 'az' ? `%${v}` : `${v}%`)

/** Admin paneli Türkçe kalır */
const isAdminArea = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

/** Elle duraklatma (gerekirse) */
export const pauseTranslation = () => suppress++
export const resumeTranslation = () => (suppress = Math.max(0, suppress - 1))
