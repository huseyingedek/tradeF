import { t as tr, tServer } from '../../i18n'
// Admin paneli etiketleri
export const PLAN_COLOR = { free: 'gray', starter: 'sky', pro: '', expert: 'orange' }
export const PLAN_NAME = { free: tr('Ücretsiz'), starter: tr('Başlangıç'), pro: tr('Pro'), expert: tr('Uzman') }

export function PlanBadge({ plan, name }) {
  return <span className={`chip ${PLAN_COLOR[plan] ?? 'gray'}`}>{tServer(name) || PLAN_NAME[plan] || plan}</span>
}

const USER_STATUS = {
  active: ['green', tr('Aktif')],
  suspended: ['red', tr('Askıda')],
  trading_halted: ['yellow', tr('İşlem durduruldu')],
  pending: ['gray', tr('Doğrulama bekliyor')],
  invited: ['sky', tr('Davet edildi')],
  disabled: ['red', tr('Erişim kapalı')],
}
export function UserStatusBadge({ status }) {
  const [c, t] = USER_STATUS[status] || ['gray', status]
  return (
    <span className={`chip ${c}`}>
      <span className={`status-dot ${c}`} />
      {t}
    </span>
  )
}

const HEALTH = { operational: ['green', tr('Çalışıyor')], degraded: ['yellow', tr('Yavaşlama')], down: ['red', tr('Kesinti')], maintenance: ['gray', tr('Bakımda')], unknown: ['gray', tr('Veri yok')] }
export function HealthBadge({ status }) {
  const [c, t] = HEALTH[status] || ['gray', status]
  return (
    <span className={`chip ${c}`}>
      <span className={`status-dot ${c} ${status === 'operational' ? 'pulse' : ''}`} />
      {t}
    </span>
  )
}

const PAY = { pending: ['yellow', tr('Onay bekliyor')], paid: ['green', tr('Ödendi')], failed: ['red', tr('Başarısız')], refunded: ['gray', tr('İade')] }
export function PaymentBadge({ status }) {
  const [c, t] = PAY[status] || ['gray', status]
  return <span className={`chip ${c}`}>{t}</span>
}

export const ACTION_LABEL = {
  'admin.login': tr('Admin girişi'),
  'user.suspend': tr('Kullanıcı askıya alındı'),
  'user.reactivate': tr('Kullanıcı yeniden etkin'),
  'user.trading_halt': tr('Kullanıcı işlemleri durduruldu'),
  'user.trading_resume': tr('Kullanıcı işlemleri açıldı'),
  'user.plan_change': tr('Plan değişikliği'),
  'user.logout_all': tr('Oturumlar sonlandırıldı'),
  'user.reset_2fa': tr('2FA sıfırlandı'),
  'user.note': tr('Not eklendi'),
  'user.verify_email': tr('Doğrulama e-postası'),
  'risk.update': tr('Platform ayarı'),
  'risk.platform_halt': 'GLOBAL DURDURMA',
  'risk.platform_resume': tr('Global durdurma kaldırıldı'),
  'provider.update': tr('Entegrasyon ayarı'),
  'provider.halt': tr('Entegrasyon durduruldu'),
  'provider.resume': tr('Entegrasyon açıldı'),
  'plan.create': tr('Plan oluşturuldu'),
  'plan.update': tr('Plan güncellendi'),
  'plan.delete': tr('Plan silindi'),
  'payment.refund': tr('İade@@eylem'),
  'announcement.create': tr('Duyuru yayınlandı'),
  'announcement.update': tr('Duyuru güncellendi'),
  'announcement.delete': tr('Duyuru silindi'),
  'team.invite': tr('Admin davet edildi'),
  'team.role_change': tr('Rol değişikliği'),
  'team.status': tr('Admin erişimi'),
  'team.remove': tr('Admin çıkarıldı'),
}
export const actionTone = (a) =>
  /halt|suspend|delete|remove|refund/.test(a) ? 'red' : /update|change|reset|status/.test(a) ? 'yellow' : /login|note|verify/.test(a) ? 'gray' : 'green'
