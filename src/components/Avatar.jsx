import { locale } from '../i18n'
const palette = ['#40189d', '#48a9f8', '#1bd084', '#ff9b52', '#20c3b2', '#f72b50', '#8bc740', '#6c5ce7']
const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase(locale)
const colorFor = (name = '') => palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]

export default function Avatar({ name, size = 40, color, className = '' }) {
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, background: color || colorFor(name), fontSize: size * 0.38 }} title={name}>
      {initials(name)}
    </span>
  )
}
