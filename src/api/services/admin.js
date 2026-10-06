import { http } from '../http'

// =====================================================================
//  ADMIN SERVİSLERİ – tüm uç noktalar /admin altında
//  Her istek admin token'ı ile gider; backend rol/izin kontrolü yapmalı.
// =====================================================================
export const adminService = {
  /** 2FA adımı: POST /auth/login → { requires2fa, challengeId } dönerse çağrılır */
  verify2fa: (challengeId, code) => http.post('/auth/2fa', { challengeId, code }),

  overview: () => http.get('/admin/overview'),

  users: (query) => http.get('/admin/users', query),
  user: (id) => http.get(`/admin/users/${id}`),
  /** { status?: 'active'|'suspended'|'trading_halted', reason?, plan? } */
  updateUser: (id, patch) => http.patch(`/admin/users/${id}`, patch),
  logoutAll: (id) => http.post(`/admin/users/${id}/logout-all`),
  reset2fa: (id, reason) => http.post(`/admin/users/${id}/reset-2fa`, { reason }),
  resendVerification: (id) => http.post(`/admin/users/${id}/resend-verification`),
  addNote: (id, text) => http.post(`/admin/users/${id}/notes`, { text }),

  platform: () => http.get('/admin/platform'),
  updatePlatform: (patch) => http.patch('/admin/platform', patch),
  platformKill: (active, reason) => http.post('/admin/platform/kill-switch', { active, reason }),

  providers: () => http.get('/admin/providers'),
  /** { enabledForNew?, tradingHalted?, maintenance?, reason? } */
  updateProvider: (id, patch) => http.patch(`/admin/providers/${id}`, patch),

  plans: () => http.get('/admin/plans'),
  savePlan: (plan) => (plan.id ? http.patch(`/admin/plans/${plan.id}`, plan) : http.post('/admin/plans', plan)),
  deletePlan: (id) => http.del(`/admin/plans/${id}`),
  payments: (query) => http.get('/admin/payments', query),
  refund: (id, reason) => http.post(`/admin/payments/${id}/refund`, { reason }),
  /** Manuel ödeme modu: havale/EFT onayı → plan aktifleşir */
  confirmPayment: (id) => http.post(`/admin/payments/${id}/confirm`),
  failPayment: (id, reason) => http.post(`/admin/payments/${id}/fail`, { reason }),

  announcements: () => http.get('/admin/announcements'),
  saveAnnouncement: (a) => (a.id ? http.patch(`/admin/announcements/${a.id}`, a) : http.post('/admin/announcements', a)),
  deleteAnnouncement: (id) => http.del(`/admin/announcements/${id}`),

  audit: (query) => http.get('/admin/audit', query),

  team: () => http.get('/admin/team'),
  invite: (data) => http.post('/admin/team', data),
  updateAdmin: (id, patch) => http.patch(`/admin/team/${id}`, patch),
  removeAdmin: (id) => http.del(`/admin/team/${id}`),
}

/** Kullanıcı paneli: aktif duyurular + platform durumu */
export const announcementService = {
  active: () => http.get('/announcements/active'),
}
