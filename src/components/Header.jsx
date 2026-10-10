import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiMenu, FiSearch, FiBell, FiMoon, FiSun, FiSettings, FiLogOut, FiLink } from 'react-icons/fi'
import Dropdown from './Dropdown'
import Avatar from './Avatar'
import { KillSwitchButton } from './KillSwitch'
import { useApp } from '../context/AppContext'
import { pageTitles } from '../data/menu'
import { useActivity, useInstruments } from '../api/queries'
import { useRealtimeStatus } from '../hooks/useMarket'
import { timeAgo } from '../utils/format'
import { t as tr, locale, tServer } from '../i18n'

const STATUS = {
  mock: ['yellow', tr('Demo veri')],
  open: ['green', tr('Canlı')],
  connecting: ['yellow', tr('Bağlanıyor')],
  reconnecting: ['yellow', tr('Yeniden bağlanıyor')],
  closed: ['red', tr('Bağlantı yok')],
  disabled: ['gray', tr('Canlı veri kapalı')],
  idle: ['gray', tr('Bekleniyor')],
}

function SymbolSearch() {
  const navigate = useNavigate()
  const { data: instruments = [] } = useInstruments()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const results = useMemo(() => {
    const raw = q.trim()
    const t = raw.toUpperCase() // semboller ASCII: "link" → "LINK" (Türkçe büyük harf "LİNK" eşleşmezdi)
    const tn = raw.toLocaleUpperCase(locale)
    if (!t) return []
    return instruments.filter((i) => i.symbol.includes(t) || i.name.toLocaleUpperCase(locale).includes(tn)).sort((a, b) => (b.symbol.startsWith(t) ? 1 : 0) - (a.symbol.startsWith(t) ? 1 : 0)).slice(0, 7)
  }, [q, instruments])
  const go = (symbol) => {
    setQ('')
    navigate(`/trade?symbol=${encodeURIComponent(symbol)}`)
  }
  return (
    <form
      className="header-search d-none d-xl-block"
      onSubmit={(e) => {
        e.preventDefault()
        if (results[0]) go(results[0].symbol)
      }}
    >
      <input className="form-control" placeholder={tr('Sembol ara (BTC, THYAO…)')} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} />
      <FiSearch />
      {focus && results.length > 0 && (
        <div className="dropdown-menu show w-100" style={{ top: 'calc(100% + 6px)' }}>
          {results.map((i) => (
            <button type="button" key={i.symbol} className="dropdown-item d-flex justify-content-between" onMouseDown={() => go(i.symbol)}>
              <span className="fw-semibold">{i.symbol}</span>
              <small className="text-muted">{i.name}</small>
            </button>
          ))}
        </div>
      )}
    </form>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { toggleSidebar, theme, toggleTheme, user, signOut, toast } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const rt = useRealtimeStatus()
  const { data: activity = [] } = useActivity({ limit: 30 })
  const alerts = activity.filter((a) => a.notify || a.level === 'danger' || a.level === 'warning').slice(0, 6)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [color, label] = STATUS[rt] || STATUS.idle

  return (
    <header className={`hn-header ${scrolled ? 'scrolled' : ''}`}>
      <button className="hamburger" onClick={toggleSidebar} aria-label={tr('Menüyü aç/kapat')}>
        <FiMenu />
      </button>
      <h1 className="page-title">{pageTitles[pathname] || tr('Tradepilo')}</h1>
      <span className={`chip ${color} d-none d-lg-inline-flex`} title={tr('Gerçek zamanlı veri bağlantısı')}>
        <span className={`status-dot ${color} ${rt === 'open' || rt === 'mock' ? 'pulse' : ''}`} /> {label}
      </span>

      <div className="ms-auto d-flex align-items-center gap-2 gap-md-3">
        <SymbolSearch />
        <KillSwitchButton />

        <button className="icon-btn d-none d-sm-inline-flex" onClick={toggleTheme} aria-label={tr('Tema değiştir')} title={tr('Tema değiştir')}>
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>

        <Dropdown
          caret={false}
          toggleClass="icon-btn"
          menuClass="dropdown-panel"
          toggle={
            <>
              <FiBell />
              {alerts.length > 0 && <span className="badge-dot">{alerts.length}</span>}
            </>
          }
        >
          <div className="panel-head d-flex justify-content-between">
            {tr('Bildirimler')}
            <button className="btn btn-link btn-sm p-0" data-close onClick={() => navigate('/activity')}>{tr('Tümü')}</button>
          </div>
          {alerts.length ? (
            alerts.map((n) => (
              <div className="panel-item" key={n.id}>
                <span className={`status-dot mt-1 ${{ danger: 'red', warning: 'yellow', success: 'green' }[n.level] || 'sky'}`} />
                <div>
                  <div>{tServer(n.message)}</div>
                  <small className="text-muted">{timeAgo(n.ts)}</small>
                </div>
              </div>
            ))
          ) : (
            <div className="panel-item text-muted">{tr('Yeni bildirim yok')}</div>
          )}
        </Dropdown>

        <Dropdown
          caret={false}
          toggleClass="user-btn"
          toggle={
            <>
              <Avatar name={user?.name || tr('Kullanıcı')} size={44} color="#40189d" />
              <span className="d-none d-md-block">
                <div className="name">{user?.name}</div>
                <div className="role">{user?.plan?.name ? tr('{0} plan', tServer(user.plan.name)) : tServer(user?.roleLabel) || tr('Yatırımcı')}</div>
              </span>
            </>
          }
        >
          <button className="dropdown-item d-flex align-items-center gap-2 py-2" data-close onClick={() => navigate('/exchanges')}>
            <FiLink /> {tr('Borsa Bağlantıları')}
          </button>
          <button className="dropdown-item d-flex align-items-center gap-2 py-2" data-close onClick={() => navigate('/settings')}>
            <FiSettings /> {tr('Ayarlar')}
          </button>
          <button className="dropdown-item d-flex align-items-center gap-2 py-2 d-sm-none" data-close onClick={toggleTheme}>
            {theme === 'dark' ? <FiSun /> : <FiMoon />} {tr('Tema')}
          </button>
          <hr className="dropdown-divider" />
          <button
            className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
            data-close
            onClick={async () => {
              await signOut()
              toast(tr('Çıkış yapıldı'), 'info')
              navigate('/login')
            }}
          >
            <FiLogOut /> {tr('Çıkış Yap')}
          </button>
        </Dropdown>
      </div>
    </header>
  )
}
