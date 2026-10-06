import { FiGrid, FiUsers, FiShield, FiServer, FiCreditCard, FiVolume2, FiFileText, FiUserCheck } from 'react-icons/fi'

// Admin menüsü – `perm` alanı olan öğe yalnızca o izne sahip adminlere görünür
export const adminMenu = [
  { title: 'Platform' },
  { label: 'Genel Bakış', icon: FiGrid, to: '/admin', perm: 'overview.read' },
  { label: 'Kullanıcılar', icon: FiUsers, to: '/admin/users', perm: 'users.read' },
  { label: 'Platform Riski', icon: FiShield, to: '/admin/risk', perm: 'risk.manage' },
  { label: 'Entegrasyonlar', icon: FiServer, to: '/admin/integrations', perm: 'overview.read' },
  { title: 'Gelir & İletişim' },
  { label: 'Abonelik & Ödemeler', icon: FiCreditCard, to: '/admin/billing', perm: 'billing.read' },
  { label: 'Duyurular', icon: FiVolume2, to: '/admin/announcements', perm: 'announcements.manage' },
  { title: 'Güvenlik' },
  { label: 'Denetim Günlüğü', icon: FiFileText, to: '/admin/audit', perm: 'audit.read' },
  { label: 'Ekip & Roller', icon: FiUserCheck, to: '/admin/team', perm: 'overview.read' },
]

export const adminTitles = {
  '/admin': 'Genel Bakış',
  '/admin/users': 'Kullanıcılar',
  '/admin/risk': 'Platform Riski',
  '/admin/integrations': 'Entegrasyonlar',
  '/admin/billing': 'Abonelik & Ödemeler',
  '/admin/announcements': 'Duyurular',
  '/admin/audit': 'Denetim Günlüğü',
  '/admin/team': 'Ekip & Roller',
}
