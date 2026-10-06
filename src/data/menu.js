import { FiGrid, FiActivity, FiTrendingUp, FiBriefcase, FiCpu, FiShield, FiLink, FiList, FiSettings } from 'react-icons/fi'

// Sidebar menü yapısı
export const menu = [
  { title: 'İşlem' },
  { label: 'Genel Bakış', icon: FiGrid, to: '/dashboard' },
  { label: 'Piyasalar', icon: FiActivity, to: '/markets' },
  { label: 'İşlem Terminali', icon: FiTrendingUp, to: '/trade' },
  {
    label: 'Portföy',
    icon: FiBriefcase,
    children: [
      { label: 'Varlıklar & Pozisyonlar', to: '/portfolio' },
      { label: 'Emirler', to: '/orders' },
    ],
  },
  {
    label: 'Otomasyon',
    icon: FiCpu,
    children: [
      { label: 'Kurallar & Alarmlar', to: '/automation' },
      { label: 'Botlar', to: '/bots' },
    ],
  },
  { label: 'Risk Yönetimi', icon: FiShield, to: '/risk' },
  { title: 'Yönetim' },
  { label: 'Borsa Bağlantıları', icon: FiLink, to: '/exchanges' },
  { label: 'İşlem Günlüğü', icon: FiList, to: '/activity' },
  { label: 'Ayarlar', icon: FiSettings, to: '/settings' },
]

export const pageTitles = {
  '/dashboard': 'Genel Bakış',
  '/markets': 'Piyasalar',
  '/trade': 'İşlem Terminali',
  '/portfolio': 'Portföy',
  '/orders': 'Emirler',
  '/automation': 'Kurallar & Alarmlar',
  '/bots': 'Botlar',
  '/risk': 'Risk Yönetimi',
  '/exchanges': 'Borsa Bağlantıları',
  '/activity': 'İşlem Günlüğü',
  '/settings': 'Ayarlar',
}
