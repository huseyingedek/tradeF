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

const STATUS = {
  mock: ['yellow', 'Demo veri'],
  open: ['green', 'Canlı'],
  connecting: ['yellow', 'Bağlanıyor'],
  reconnecting: ['yellow', 'Yeniden bağlanıyor'],
  closed: ['red', 'Bağlantı yok'],
  disabled: ['gray', 'Canlı veri kapalı'],
  idle: ['gray', 'Bekleniyor'],
}

function SymbolSearch() {
  const navigate = useNavigate()
  const { data: instruments = [] } = useInstruments()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const results = useMemo(() => {
    const t = q.trim().toLocaleUpperCase('tr-TR')
    if (!t) return []
    return instruments.filter((i) => i.symbol.includes(t) || i.name.toLocaleUpperCase('tr-TR').includes(t)).slice(0, 7)
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
      <input className="form-control" placeholder="Sembol ara (BTC, THYAO…)" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} />
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
      <button className="hamburger" onClick={toggleSidebar} aria-label="Menüyü aç/kapat">
        <FiMenu />
      </button>
      <h1 className="page-title">{pageTitles[pathname] || 'Tradepilo'}</h1>
      <span className={`chip ${color} d-none d-lg-inline-flex`} title="Gerçek zamanlı veri bağlantısı">
        <span className={`status-dot ${color} ${rt === 'open' || rt === 'mock' ? 'pulse' : ''}`} /> {label}
      </span>

      <div className="ms-auto d-flex align-items-center gap-2 gap-md-3">
        <SymbolSearch />
        <KillSwitchButton />

        <button className="icon-btn d-none d-sm-inline-flex" onClick={toggleTheme} aria-label="Tema değiştir" title="Tema değiştir">
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
            Bildirimler
            <button className="btn btn-link btn-sm p-0" data-close onClick={() => navigate('/activity')}>Tümü</button>
          </div>
          {alerts.length ? (
            alerts.map((n) => (
              <div className="panel-item" key={n.id}>
                <span className={`status-dot mt-1 ${{ danger: 'red', warning: 'yellow', success: 'green' }[n.level] || 'sky'}`} />
                <div>
                  <div>{n.message}</div>
                  <small className="text-muted">{timeAgo(n.ts)}</small>
                </div>
              </div>
            ))
          ) : (
            <div className="panel-item text-muted">Yeni bildirim yok</div>
          )}
        </Dropdown>

        <Dropdown
          caret={false}
          toggleClass="user-btn"
          toggle={
            <>
              <Avatar name={user?.name || 'Kullanıcı'} size={44} color="#40189d" />
              <span className="d-none d-md-block">
                <div className="name">{user?.name}</div>
                <div className="role">{user?.plan?.name ? `${user.plan.name} plan` : user?.roleLabel || 'Yatırımcı'}</div>
              </span>
            </>
          }
        >
          <button className="dropdown-item d-flex align-items-center gap-2 py-2" data-close onClick={() => navigate('/exchanges')}>
            <FiLink /> Borsa Bağlantıları
          </button>
          <button className="dropdown-item d-flex align-items-center gap-2 py-2" data-close onClick={() => navigate('/settings')}>
            <FiSettings /> Ayarlar
          </button>
          <button className="dropdown-item d-flex align-items-center gap-2 py-2 d-sm-none" data-close onClick={toggleTheme}>
            {theme === 'dark' ? <FiSun /> : <FiMoon />} Tema
          </button>
          <hr className="dropdown-divider" />
          <button
            className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
            data-close
            onClick={async () => {
              await signOut()
              toast('Çıkış yapıldı', 'info')
              navigate('/login')
            }}
          >
            <FiLogOut /> Çıkış Yap
          </button>
        </Dropdown>
      </div>
    </header>
  )
}
