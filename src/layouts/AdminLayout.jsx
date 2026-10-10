import { Suspense, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { useApp } from '../context/AppContext'
import { useTickerFeed } from '../hooks/useMarket'
import { useRealtimeSync, useRisk } from '../api/queries'
import { FiAlertOctagon } from 'react-icons/fi'
import { timeAgo } from '../utils/format'
import { Link } from 'react-router-dom'
import AnnouncementBanner from '../components/admin/AnnouncementBanner'
import { useActiveAnnouncements } from '../api/adminQueries'
import { useProviders } from '../api/queries'
import { useQuery } from '@tanstack/react-query'
import { metaService } from '../api/services'
import { t, tServer } from '../i18n'

function LiveData() {
  useTickerFeed()
  useRealtimeSync()
  return null
}

const readDismissed = () => {
  try {
    return JSON.parse(localStorage.getItem('tn-dismissed-ann') || '[]')
  } catch {
    return []
  }
}

/** Platform yöneticisinden gelen durum ve duyurular */
function PlatformNotices() {
  const { data } = useActiveAnnouncements()
  const { data: providers = [] } = useProviders()
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: metaService.get, staleTime: 5 * 60_000 })
  const [dismissed, setDismissed] = useState(readDismissed)
  if (!data) return null
  const p = data.platform
  const dismiss = (id) => {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      localStorage.setItem('tn-dismissed-ann', JSON.stringify(next))
    } catch {
      /* yoksay */
    }
  }
  const halted = p.haltedProviders.map((id) => providers.find((x) => x.id === id)?.name || id)
  return (
    <>
      {p.tradingHalted && (
        <div className="kill-banner"><FiAlertOctagon size={20} /><span><strong>{t('Platform genelinde işlemler geçici olarak durduruldu.')}</strong> {tServer(p.haltReason)}{t('. Zarar-kes / kâr-al korumalarınız çalışmaya devam ediyor.')}</span></div>
      )}
      {data.account?.status === 'trading_halted' && (
        <div className="kill-banner"><FiAlertOctagon size={20} /><span><strong>{t('Hesabınızda işlemler durduruldu.')}</strong> {t('Ayrıntı için destek ekibiyle iletişime geçin.')}</span></div>
      )}
      {p.maintenance?.active && <AnnouncementBanner a={{ level: 'maintenance', title: t('Bakım modu:'), message: p.maintenance.message || t('Emir girişi geçici olarak kapalı.') }} />}
      {halted.length > 0 && <AnnouncementBanner a={{ level: 'warning', title: `${halted.join(', ')}:`, message: t('Bu platformda işlemler yönetici tarafından geçici olarak durduruldu.') }} />}
      {meta && !meta.liveTradingEnabled && !dismissed.includes('paper-mode') && (
        <AnnouncementBanner
          a={{ level: 'info', title: t('Deneme modu:'), message: t('Tüm işlemler sanal (paper) bakiye ile yapılır; gerçek para kullanılmaz ve borsaya gerçek emir gönderilmez. Kripto fiyatları gerçek, BIST ve forex fiyatları simülasyondur.') }}
          onDismiss={() => dismiss('paper-mode')}
        />
      )}
      {data.announcements.filter((a) => !dismissed.includes(a.id)).map((a) => (
        <AnnouncementBanner key={a.id} a={a} onDismiss={() => dismiss(a.id)} />
      ))}
    </>
  )
}

function KillBanner() {
  const { data: risk } = useRisk()
  if (!risk?.killSwitch?.active) return null
  return (
    <div className="kill-banner">
      <FiAlertOctagon size={20} />
      <span>
        <strong>{t('Acil durdurma aktif.')}</strong> {tServer(risk.killSwitch.reason)} · {timeAgo(risk.killSwitch.at)}{t('. Yeni emir, bot ve kural işlemleri engellendi.')}
      </span>
      <Link to="/risk" className="ms-auto fw-semibold">{t('Risk paneline git →')}</Link>
    </div>
  )
}

export default function AdminLayout() {
  const { user, sidebarMini, sidebarOpen, setSidebarOpen } = useApp()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (user.kind === 'admin') return <Navigate to="/admin" replace />

  return (
    <div className={`hn-wrapper ${sidebarMini ? 'sidebar-mini' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <LiveData />
      <Sidebar />
      <div className="hn-backdrop" onClick={() => setSidebarOpen(false)} />
      <div className="hn-main">
        <Header />
        <main className="hn-content">
          <PlatformNotices />
          <KillBanner />
          <Suspense fallback={<div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="hn-footer">
          {t('Tradepilo · Yatırım tavsiyesi değildir. Otomatik işlemler risk içerir.')}
        </footer>
      </div>
    </div>
  )
}
