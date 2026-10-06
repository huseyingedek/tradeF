// Admin paneli etiketleri
export const PLAN_COLOR = { free: 'gray', starter: 'sky', pro: '', expert: 'orange' }
export const PLAN_NAME = { free: 'Ücretsiz', starter: 'Başlangıç', pro: 'Pro', expert: 'Uzman' }

export function PlanBadge({ plan, name }) {
  return <span className={`chip ${PLAN_COLOR[plan] ?? 'gray'}`}>{name || PLAN_NAME[plan] || plan}</span>
}

const USER_STATUS = {
  active: ['green', 'Aktif'],
  suspended: ['red', 'Askıda'],
  trading_halted: ['yellow', 'İşlem durduruldu'],
  pending: ['gray', 'Doğrulama bekliyor'],
  invited: ['sky', 'Davet edildi'],
  disabled: ['red', 'Erişim kapalı'],
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

const HEALTH = { operational: ['green', 'Çalışıyor'], degraded: ['yellow', 'Yavaşlama'], down: ['red', 'Kesinti'], maintenance: ['gray', 'Bakımda'], unknown: ['gray', 'Veri yok'] }
export function HealthBadge({ status }) {
  const [c, t] = HEALTH[status] || ['gray', status]
  return (
    <span className={`chip ${c}`}>
      <span className={`status-dot ${c} ${status === 'operational' ? 'pulse' : ''}`} />
      {t}
    </span>
  )
}

const PAY = { pending: ['yellow', 'Onay bekliyor'], paid: ['green', 'Ödendi'], failed: ['red', 'Başarısız'], refunded: ['gray', 'İade'] }
export function PaymentBadge({ status }) {
  const [c, t] = PAY[status] || ['gray', status]
  return <span className={`chip ${c}`}>{t}</span>
}

export const ACTION_LABEL = {
  'admin.login': 'Admin girişi',
  'user.suspend': 'Kullanıcı askıya alındı',
  'user.reactivate': 'Kullanıcı yeniden etkin',
  'user.trading_halt': 'Kullanıcı işlemleri durduruldu',
  'user.trading_resume': 'Kullanıcı işlemleri açıldı',
  'user.plan_change': 'Plan değişikliği',
  'user.logout_all': 'Oturumlar sonlandırıldı',
  'user.reset_2fa': '2FA sıfırlandı',
  'user.note': 'Not eklendi',
  'user.verify_email': 'Doğrulama e-postası',
  'risk.update': 'Platform ayarı',
  'risk.platform_halt': 'GLOBAL DURDURMA',
  'risk.platform_resume': 'Global durdurma kaldırıldı',
  'provider.update': 'Entegrasyon ayarı',
  'provider.halt': 'Entegrasyon durduruldu',
  'provider.resume': 'Entegrasyon açıldı',
  'plan.create': 'Plan oluşturuldu',
  'plan.update': 'Plan güncellendi',
  'plan.delete': 'Plan silindi',
  'payment.refund': 'İade',
  'announcement.create': 'Duyuru yayınlandı',
  'announcement.update': 'Duyuru güncellendi',
  'announcement.delete': 'Duyuru silindi',
  'team.invite': 'Admin davet edildi',
  'team.role_change': 'Rol değişikliği',
  'team.status': 'Admin erişimi',
  'team.remove': 'Admin çıkarıldı',
}
export const actionTone = (a) =>
  /halt|suspend|delete|remove|refund/.test(a) ? 'red' : /update|change|reset|status/.test(a) ? 'yellow' : /login|note|verify/.test(a) ? 'gray' : 'green'
