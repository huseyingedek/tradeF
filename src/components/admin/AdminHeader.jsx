import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiMenu, FiMoon, FiSun, FiLogOut, FiShield, FiAlertOctagon, FiTool, FiKey } from 'react-icons/fi'
import PasswordModal from '../PasswordModal'
import Dropdown from '../Dropdown'
import Avatar from '../Avatar'
import { useApp } from '../../context/AppContext'
import { adminTitles } from '../../data/adminMenu'
import { usePlatform } from '../../api/adminQueries'

export default function AdminHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { toggleSidebar, theme, toggleTheme, user, signOut, toast } = useApp()
  const { data: platform } = usePlatform()
  const [scrolled, setScrolled] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const path = pathname.replace(/\/$/, '') || '/admin'
  const title = adminTitles[path] || (path.startsWith('/admin/users/') ? 'Kullanıcı Detayı' : 'Admin')
  const halted = platform?.killSwitch?.active
  const maint = platform?.maintenance?.active

  return (
    <header className={`hn-header ${scrolled ? 'scrolled' : ''}`}>
      <button className="hamburger" onClick={toggleSidebar} aria-label="Menüyü aç/kapat"><FiMenu /></button>
      <h1 className="page-title">{title}</h1>
      <Link to="/admin/risk" className={`chip ${halted ? 'red' : maint ? 'yellow' : 'green'} d-none d-lg-inline-flex`} title="Platform durumu">
        {halted ? <FiAlertOctagon /> : maint ? <FiTool /> : <span className="status-dot green pulse" />}
        {halted ? 'İşlemler durduruldu' : maint ? 'Bakım modu' : 'Platform aktif'}
      </Link>
      <div className="ms-auto d-flex align-items-center gap-2 gap-md-3">
        <span className={`chip ${{ super_admin: 'red', risk: 'yellow', support: 'sky', finance: 'green' }[user?.role] || 'gray'} d-none d-sm-inline-flex`}>
          <FiShield /> {user?.roleLabel}
        </span>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Tema değiştir">{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>
        <Dropdown
          caret={false}
          toggleClass="user-btn"
          toggle={
            <>
              <Avatar name={user?.name || 'Admin'} size={44} color="#e8384f" />
              <span className="d-none d-md-block">
                <div className="name">{user?.name}</div>
                <div className="role">{user?.email}</div>
              </span>
            </>
          }
        >
          <div className="dropdown-item-text fs-13 text-muted">2FA ile giriş yapıldı</div>
          <button className="dropdown-item d-flex align-items-center gap-2 py-2" data-close onClick={() => setPwOpen(true)}>
            <FiKey /> Şifre değiştir
          </button>
          <hr className="dropdown-divider" />
          <button
            className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
            data-close
            onClick={async () => {
              await signOut()
              toast('Admin oturumu kapatıldı', 'info')
              navigate('/login')
            }}
          >
            <FiLogOut /> Çıkış Yap
          </button>
        </Dropdown>
      </div>
      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}
    </header>
  )
}
