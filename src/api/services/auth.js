import { http } from '../http'

export const authService = {
  /** @returns {Promise<{token, user} | {requires2fa, challengeId, setupRequired?, qr?, secret?}>} */
  login: (email, password) => http.post('/auth/login', { email, password }),
  verify2fa: (challengeId, code) => http.post('/auth/2fa', { challengeId, code }),
  register: (data) => http.post('/auth/register', data),
  me: () => http.get('/auth/me'),
  updateMe: (patch) => http.patch('/auth/me', patch),
  logout: () => http.post('/auth/logout'),
  deleteAccount: (password, code) => http.post('/auth/delete-account', { password, code }),
  changePassword: (currentPassword, newPassword) => http.post('/auth/change-password', { currentPassword, newPassword }),
  setup2fa: () => http.post('/auth/2fa/setup'),
  enable2fa: (challengeId, code) => http.post('/auth/2fa/enable', { challengeId, code }),
  disable2fa: (code) => http.post('/auth/2fa/disable', { code }),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => http.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => http.post('/auth/verify-email', { token }),
  acceptInvite: (token, password) => http.post('/auth/accept-invite', { token, password }),
  sessions: () => http.get('/auth/sessions'),
  revokeSession: (id) => http.del(`/auth/sessions/${id}`),
}

export const billingService = {
  plans: () => http.get('/billing/plans'),
  payments: () => http.get('/billing/payments'),
  subscribe: (planId, billing) => http.post('/billing/subscribe', { planId, billing }),
}

export const metaService = {
  get: () => http.get('/meta'),
}
