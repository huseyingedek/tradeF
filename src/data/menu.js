import { FiGrid, FiActivity, FiTrendingUp, FiBriefcase, FiCpu, FiShield, FiLink, FiList, FiSettings } from 'react-icons/fi'
import { t } from '../i18n'

// Sidebar menü yapısı
export const menu = [
  { title: t('İşlem@@menü') },
  { label: t('Genel Bakış'), icon: FiGrid, to: '/dashboard' },
  { label: t('Piyasalar'), icon: FiActivity, to: '/markets' },
  { label: t('İşlem Terminali'), icon: FiTrendingUp, to: '/trade' },
  {
    label: t('Portföy'),
    icon: FiBriefcase,
    children: [
      { label: t('Varlıklar & Pozisyonlar'), to: '/portfolio' },
      { label: t('Emirler'), to: '/orders' },
    ],
  },
  {
    label: t('Otomasyon'),
    icon: FiCpu,
    children: [
      { label: t('Kurallar & Alarmlar'), to: '/automation' },
      { label: t('Botlar'), to: '/bots' },
    ],
  },
  { label: t('Risk Yönetimi'), icon: FiShield, to: '/risk' },
  { title: t('Yönetim') },
  { label: t('Borsa Bağlantıları'), icon: FiLink, to: '/exchanges' },
  { label: t('İşlem Günlüğü'), icon: FiList, to: '/activity' },
  { label: t('Ayarlar'), icon: FiSettings, to: '/settings' },
]

export const pageTitles = {
  '/dashboard': t('Genel Bakış'),
  '/markets': t('Piyasalar'),
  '/trade': t('İşlem Terminali'),
  '/portfolio': t('Portföy'),
  '/orders': t('Emirler'),
  '/automation': t('Kurallar & Alarmlar'),
  '/bots': t('Botlar'),
  '/risk': t('Risk Yönetimi'),
  '/exchanges': t('Borsa Bağlantıları'),
  '/activity': t('İşlem Günlüğü'),
  '/settings': t('Ayarlar'),
}
