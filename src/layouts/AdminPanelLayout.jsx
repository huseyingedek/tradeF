import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import AdminHeader from '../components/admin/AdminHeader'
import { useApp } from '../context/AppContext'
import { adminMenu } from '../data/adminMenu'

export default function AdminPanelLayout() {
  const { user, sidebarMini, sidebarOpen, setSidebarOpen } = useApp()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (user.kind !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div className={`hn-wrapper admin-mode ${sidebarMini ? 'sidebar-mini' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar items={adminMenu} home="/admin" badge="ADMIN" footer={<><strong>Tradepilo Yönetim</strong>Tüm işlemler denetim günlüğüne kaydedilir</>} />
      <div className="hn-backdrop" onClick={() => setSidebarOpen(false)} />
      <div className="hn-main">
        <AdminHeader />
        <main className="hn-content">
          <Suspense fallback={<div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="hn-footer">Tradepilo Admin · Yetkisiz erişim yasaktır</footer>
      </div>
    </div>
  )
}
