import { FiGrid, FiUsers, FiShield, FiServer, FiCreditCard, FiVolume2, FiFileText, FiUserCheck } from 'react-icons/fi'
import { t } from '../i18n'

// Admin menüsü – `perm` alanı olan öğe yalnızca o izne sahip adminlere görünür
export const adminMenu = [
  { title: t('Platform') },
  { label: t('Genel Bakış'), icon: FiGrid, to: '/admin', perm: 'overview.read' },
  { label: t('Kullanıcılar'), icon: FiUsers, to: '/admin/users', perm: 'users.read' },
  { label: t('Platform Riski'), icon: FiShield, to: '/admin/risk', perm: 'risk.manage' },
  { label: t('Entegrasyonlar'), icon: FiServer, to: '/admin/integrations', perm: 'overview.read' },
  { title: t('Gelir & İletişim') },
  { label: t('Abonelik & Ödemeler'), icon: FiCreditCard, to: '/admin/billing', perm: 'billing.read' },
  { label: t('Duyurular'), icon: FiVolume2, to: '/admin/announcements', perm: 'announcements.manage' },
  { title: t('Güvenlik') },
  { label: t('Denetim Günlüğü'), icon: FiFileText, to: '/admin/audit', perm: 'audit.read' },
  { label: t('Ekip & Roller'), icon: FiUserCheck, to: '/admin/team', perm: 'overview.read' },
]

export const adminTitles = {
  '/admin': t('Genel Bakış'),
  '/admin/users': t('Kullanıcılar'),
  '/admin/risk': t('Platform Riski'),
  '/admin/integrations': t('Entegrasyonlar'),
  '/admin/billing': t('Abonelik & Ödemeler'),
  '/admin/announcements': t('Duyurular'),
  '/admin/audit': t('Denetim Günlüğü'),
  '/admin/team': t('Ekip & Roller'),
}
