import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import Logo from './Logo'
import { menu } from '../data/menu'
import { useApp } from '../context/AppContext'
import { useCan } from '../api/adminQueries'

const YEAR = new Date().getFullYear()
const groupOf = (items, path) => items.findIndex((m) => m.children?.some((c) => c.to === path))

export default function Sidebar({ items = menu, home = '/dashboard', badge, footer }) {
  const can = useCan()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setTheme, sidebarMini, setSidebarOpen } = useApp()
  const [open, setOpen] = useState(() => groupOf(items, pathname))

  // Rota değişince ilgili grubu aç, mobilde çekmeceyi kapat
  useEffect(() => {
    const g = groupOf(items, pathname)
    if (g !== -1) setOpen(g)
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, setSidebarOpen])

  const isMini = () => sidebarMini && window.matchMedia('(min-width: 1200px)').matches

  return (
    <aside className="hn-sidebar">
      <Link to={home} className="hn-brand">
        <Logo />
        {badge && <span className="brand-badge">{badge}</span>}
      </Link>

      <nav className="hn-menu">
        {items.map((item, i) => {
          if (item.perm && !can(item.perm)) return null
          if (item.title) return <div key={i} className="menu-title">{item.title}</div>
          const Icon = item.icon

          if (!item.children) {
            return (
              <NavLink
                key={i}
                to={item.to}
                end
                className={({ isActive }) => `menu-link ${isActive ? 'active-single' : ''}`}
                title={item.label}
              >
                <Icon className="menu-icon" />
                <span className="menu-text">{item.label}</span>
              </NavLink>
            )
          }

          const containsActive = item.children.some((c) => c.to === pathname)
          const isOpen = open === i
          return (
            <div key={i}>
              <button
                type="button"
                className={`menu-link ${isOpen ? 'open' : ''} ${containsActive ? 'active-parent' : ''}`}
                onClick={() => {
                  if (isMini()) {
                    const first = item.children[0]
                    if (first.theme) setTheme(first.theme)
                    navigate(first.to)
                  } else setOpen(isOpen ? -1 : i)
                }}
                aria-expanded={isOpen}
                title={item.label}
              >
                <Icon className="menu-icon" />
                <span className="menu-text">{item.label}</span>
                <FiChevronDown className="chev" />
              </button>
              {isOpen && (
                <ul className="submenu">
                  {item.children.map((c) => (
                    <li key={c.to}>
                      <NavLink to={c.to} end onClick={() => c.theme && setTheme(c.theme)}>
                        {c.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      <div className="hn-sidebar-footer">
        {footer || (
          <>
            <strong>Tradepilo</strong>Çoklu borsa yönetim paneli · © {YEAR}
          </>
        )}
      </div>
    </aside>
  )
}
