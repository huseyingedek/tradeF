// =====================================================================
//  MOCK REST ROUTER
//  http.js, VITE_USE_MOCK=true iken istekleri buraya yönlendirir.
//  Rotalar docs/API.md'deki gerçek backend sözleşmesiyle aynıdır.
// =====================================================================
import { engine, MockError } from './engine'
import { providers, instruments } from './data'
import { admin } from './admin'

const sanitizeConn = ({ credentialsValid, ...c }) => {
  void credentialsValid
  return c
}
const instrumentView = ({ price, vol, ...i }) => {
  void price
  void vol
  return i
}

const routes = [
  // ---- auth
  ['POST', '/auth/login', ({ body }) => {
    if (!/^\S+@\S+\.\S+$/.test(body?.email || '')) throw new MockError(400, 'Geçerli bir e-posta girin')
    if ((body?.password || '').length < 6) throw new MockError(401, 'E-posta veya şifre hatalı')
    // Admin hesapları her zaman 2FA ister
    const challenge = admin.adminLoginStart(body.email)
    if (challenge) return challenge
    if (admin.db.users.find((u) => u.id === 'u_1')?.status === 'suspended') throw new MockError(403, 'Hesabınız askıya alınmış. Destek ile iletişime geçin.', 'ACCOUNT_SUSPENDED')
    return { token: `mock.${Date.now().toString(36)}.token`, user: { ...engine.db.user, email: body.email } }
  }],
  ['POST', '/auth/2fa', ({ body }) => admin.adminLoginVerify(body?.challengeId, body?.code)],
  ['POST', '/auth/register', ({ body }) => {
    if (!admin.db.platform.registrationOpen) throw new MockError(403, 'Yeni kayıtlar geçici olarak kapalı', 'REGISTRATION_CLOSED')
    if (!body?.name || !body?.email || (body?.password || '').length < 6) throw new MockError(400, 'Eksik bilgi')
    engine.db.user = { ...engine.db.user, name: body.name, email: body.email }
    engine.save()
    return { token: `mock.${Date.now().toString(36)}.token`, user: engine.db.user }
  }],
  ['GET', '/auth/me', () => ({ ...engine.db.user, plan: admin.activeForUser().account.plan, usage: { exchanges: engine.db.connections.length, bots: engine.db.bots.length, rules: engine.db.rules.length } })],
  ['GET', '/announcements/active', () => admin.activeForUser()],
  ['PATCH', '/auth/me', ({ body }) => {
    engine.db.user = { ...engine.db.user, ...body, notifications: { ...engine.db.user.notifications, ...(body.notifications || {}) } }
    engine.save()
    return engine.db.user
  }],

  // ---- platformlar & bağlantılar
  ['GET', '/providers', () => providers],
  ['GET', '/exchanges', () => engine.db.connections.map(sanitizeConn)],
  ['POST', '/exchanges', ({ body }) => sanitizeConn(engine.createConnection(body))],
  ['POST', '/exchanges/:id/test', ({ params }) => engine.testConnection(params.id)],
  ['PATCH', '/exchanges/:id', ({ params, body }) => sanitizeConn(engine.updateConnection(params.id, body))],
  ['DELETE', '/exchanges/:id', ({ params }) => engine.deleteConnection(params.id)],

  // ---- piyasa verisi
  ['GET', '/markets/instruments', ({ query }) => instruments.filter((i) => !query.market || i.market === query.market).map(instrumentView)],
  ['GET', '/markets/tickers', ({ query }) => engine.tickers(query.symbols ? query.symbols.split(',') : null)],
  ['GET', '/markets/candles', ({ query }) => engine.candlesFor(query.symbol, query.interval, +query.limit || 300)],
  ['GET', '/markets/orderbook', ({ query }) => engine.orderBook(query.symbol, +query.depth || 14)],
  ['GET', '/markets/trades', ({ query }) => engine.recentTrades(query.symbol)],

  // ---- emirler
  ['GET', '/orders', ({ query }) => {
    let list = engine.db.orders
    if (query.status === 'open') list = list.filter((o) => o.status === 'open')
    if (query.status === 'history') list = list.filter((o) => o.status !== 'open')
    if (query.exchangeId) list = list.filter((o) => o.exchangeId === query.exchangeId)
    if (query.symbol) list = list.filter((o) => o.symbol === query.symbol)
    return list.slice(0, +query.limit || 500)
  }],
  ['POST', '/orders', ({ body }) => engine.placeOrder(body)],
  ['DELETE', '/orders/:id', ({ params }) => engine.cancelOrder(params.id)],
  ['POST', '/orders/cancel-all', ({ body }) => engine.cancelAll(body || {})],

  // ---- pozisyonlar & bakiyeler & portföy
  ['GET', '/positions', () => engine.db.positions],
  ['POST', '/positions/:id/close', ({ params, body }) => engine.closePosition(params.id, body?.percent ?? 100)],
  ['PATCH', '/positions/:id', ({ params, body }) => engine.updatePosition(params.id, body)],
  ['GET', '/balances', () => engine.balancesView()],
  ['GET', '/portfolio/summary', () => engine.portfolioSummary()],
  ['GET', '/portfolio/history', ({ query }) => engine.portfolioHistory(query.range)],

  // ---- otomasyon: kurallar
  ['GET', '/rules', () => engine.db.rules],
  ['POST', '/rules', ({ body }) => {
    engine.validateRule(body)
    admin.checkPlanLimit('rules')
    const r = { ...body, id: `rl_${Date.now().toString(36)}`, triggerCount: 0, lastTriggeredAt: null, createdAt: Date.now(), enabled: body.enabled ?? true }
    engine.db.rules.unshift(r)
    engine.log('info', 'manual', `Yeni kural oluşturuldu: ${r.name}`)
    engine.emit('rules', r)
    engine.save()
    return r
  }],
  ['PATCH', '/rules/:id', ({ params, body }) => {
    const r = engine.db.rules.find((x) => x.id === params.id)
    if (!r) throw new MockError(404, 'Kural bulunamadı')
    const next = { ...r, ...body }
    engine.validateRule(next)
    Object.assign(r, next)
    engine.ruleArmed.delete(r.id)
    engine.emit('rules', r)
    engine.save()
    return r
  }],
  ['DELETE', '/rules/:id', ({ params }) => {
    engine.db.rules = engine.db.rules.filter((x) => x.id !== params.id)
    engine.emit('rules', null)
    engine.save()
    return { ok: true }
  }],

  // ---- otomasyon: botlar
  ['GET', '/bots', () => engine.db.bots],
  ['POST', '/bots', ({ body }) => {
    engine.validateBot(body)
    admin.checkPlanLimit('bots')
    const b = {
      ...body, id: `bt_${Date.now().toString(36)}`, investment: +body.investment, status: 'stopped', pnl: 0, trades: 0, startedAt: null, pnlHistory: [0],
    }
    engine.db.bots.unshift(b)
    engine.log('info', 'manual', `Yeni bot oluşturuldu: ${b.name}`, { symbol: b.symbol, exchangeId: b.exchangeId })
    if (body.autoStart) engine.setBotStatus(b.id, 'running')
    engine.emit('bots', b)
    engine.save()
    return b
  }],
  ['POST', '/bots/:id/start', ({ params }) => {
    const p = admin.activeForUser()
    if (p.platform.tradingHalted) throw new MockError(423, 'Platform genelinde işlemler durduruldu', 'PLATFORM_HALT')
    if (p.account.status !== 'active') throw new MockError(423, 'Hesabınızda işlemler durdurulmuş', 'USER_HALT')
    return engine.setBotStatus(params.id, 'running')
  }],
  ['POST', '/bots/:id/pause', ({ params }) => engine.setBotStatus(params.id, 'paused')],
  ['POST', '/bots/:id/stop', ({ params }) => engine.setBotStatus(params.id, 'stopped')],
  ['DELETE', '/bots/:id', ({ params }) => {
    const b = engine.db.bots.find((x) => x.id === params.id)
    if (b?.status === 'running') throw new MockError(409, 'Çalışan bot silinemez, önce durdurun')
    engine.db.bots = engine.db.bots.filter((x) => x.id !== params.id)
    engine.emit('bots', null)
    engine.save()
    return { ok: true }
  }],

  // ---- risk
  ['GET', '/risk', () => engine.riskState()],
  ['PATCH', '/risk', ({ body }) => engine.updateRisk(body)],
  ['POST', '/risk/kill-switch', ({ body }) => engine.setKillSwitch(body, 'manual')],

  // ---- aktivite
  ['GET', '/activity', ({ query }) => {
    let list = engine.db.activity
    if (query.source) list = list.filter((a) => a.source === query.source)
    if (query.level) list = list.filter((a) => a.level === query.level)
    return list.slice(0, +query.limit || 200)
  }],

  // ---- yalnızca mock: demo verisini sıfırla
  // =================================================================
  //  ADMIN
  // =================================================================
  ['GET', '/admin/overview', ({ token }) => (admin.require(token, 'overview.read'), admin.overview())],
  ['GET', '/admin/users', ({ token, query }) => (admin.require(token, 'users.read'), admin.listUsers(query))],
  ['GET', '/admin/users/:id', ({ token, params }) => (admin.require(token, 'users.read'), admin.userDetail(params.id))],
  ['PATCH', '/admin/users/:id', ({ token, params, body }) => admin.updateUser(token, params.id, body)],
  ['POST', '/admin/users/:id/logout-all', ({ token, params }) => admin.userAction(token, params.id, 'logout-all')],
  ['POST', '/admin/users/:id/reset-2fa', ({ token, params, body }) => admin.userAction(token, params.id, 'reset-2fa', body)],
  ['POST', '/admin/users/:id/resend-verification', ({ token, params }) => admin.userAction(token, params.id, 'resend-verification')],
  ['POST', '/admin/users/:id/notes', ({ token, params, body }) => admin.userAction(token, params.id, 'note', body)],
  ['GET', '/admin/platform', ({ token }) => (admin.require(token, 'overview.read'), admin.db.platform)],
  ['PATCH', '/admin/platform', ({ token, body }) => admin.updatePlatform(token, body)],
  ['POST', '/admin/platform/kill-switch', ({ token, body }) => admin.platformKill(token, body || {})],
  ['GET', '/admin/providers', ({ token }) => (admin.require(token, 'overview.read'), { providers: admin.providerHealth(), incidents: admin.db.incidents })],
  ['PATCH', '/admin/providers/:id', ({ token, params, body }) => admin.updateProvider(token, params.id, body)],
  ['GET', '/admin/plans', ({ token }) => (admin.require(token, 'billing.read'), admin.plansView())],
  ['POST', '/admin/plans', ({ token, body }) => admin.savePlan(token, null, body)],
  ['PATCH', '/admin/plans/:id', ({ token, params, body }) => admin.savePlan(token, params.id, body)],
  ['DELETE', '/admin/plans/:id', ({ token, params }) => admin.deletePlan(token, params.id)],
  ['GET', '/admin/payments', ({ token, query }) => (admin.require(token, 'billing.read'), admin.listPayments(query))],
  ['POST', '/admin/payments/:id/refund', ({ token, params, body }) => admin.refund(token, params.id, body?.reason)],
  ['GET', '/admin/announcements', ({ token }) => (admin.require(token, 'announcements.manage'), admin.db.announcements)],
  ['POST', '/admin/announcements', ({ token, body }) => admin.saveAnnouncement(token, null, body)],
  ['PATCH', '/admin/announcements/:id', ({ token, params, body }) => admin.saveAnnouncement(token, params.id, { ...admin.db.announcements.find((a) => a.id === params.id), ...body })],
  ['DELETE', '/admin/announcements/:id', ({ token, params }) => admin.deleteAnnouncement(token, params.id)],
  ['GET', '/admin/audit', ({ token, query }) => {
    admin.require(token, 'audit.read')
    let list = admin.db.audit
    if (query.actor) list = list.filter((a) => a.actor === query.actor)
    if (query.action) list = list.filter((a) => a.action.startsWith(query.action))
    if (query.q) list = list.filter((a) => `${a.target} ${a.details}`.toLocaleLowerCase('tr-TR').includes(query.q.toLocaleLowerCase('tr-TR')))
    return list.slice(0, +query.limit || 300)
  }],
  ['GET', '/admin/team', ({ token }) => (admin.require(token, 'overview.read'), admin.teamView())],
  ['POST', '/admin/team', ({ token, body }) => admin.inviteAdmin(token, body)],
  ['PATCH', '/admin/team/:id', ({ token, params, body }) => admin.updateAdmin(token, params.id, body)],
  ['DELETE', '/admin/team/:id', ({ token, params }) => admin.removeAdmin(token, params.id)],

  // ---- hesap yönetimi (mock: basit yanıtlar)
  ['POST', '/auth/logout', () => ({ ok: true })],
  ['POST', '/auth/change-password', ({ body }) => {
    if ((body?.newPassword || '').length < 8) throw new MockError(400, 'Şifre en az 8 karakter olmalı')
    return { ok: true }
  }],
  ['POST', '/auth/2fa/setup', () => ({ challengeId: 'mock_setup', secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/Tradepilo:demo?secret=JBSWY3DPEHPK3PXP', qr: null })],
  ['POST', '/auth/2fa/enable', () => {
    engine.db.user = { ...engine.db.user, twoFactor: true }
    engine.save()
    return { ...engine.db.user }
  }],
  ['POST', '/auth/2fa/disable', () => {
    engine.db.user = { ...engine.db.user, twoFactor: false }
    engine.save()
    return { ...engine.db.user }
  }],
  ['POST', '/auth/forgot-password', () => ({ ok: true })],
  ['POST', '/auth/reset-password', () => ({ ok: true })],
  ['POST', '/auth/verify-email', () => ({ ok: true })],
  ['POST', '/auth/accept-invite', () => ({ ok: true })],
  ['GET', '/billing/plans', () => admin.db.plans.filter((p) => p.active)],
  ['GET', '/billing/payments', () => []],
  ['POST', '/billing/subscribe', ({ body }) => {
    const plan = admin.db.plans.find((p) => p.id === body?.planId)
    if (!plan) throw new MockError(400, 'Plan bulunamadı')
    return { status: 'pending', amount: body.billing === 'yearly' ? plan.priceYearly : plan.priceMonthly, currency: 'TRY' }
  }],
  ['GET', '/meta', () => ({ name: 'Tradepilo (mock)', liveTradingEnabled: false, paymentsMode: 'manual', marketData: { mode: 'sim', connected: false } })],

  ['POST', '/mock/reset', () => {
    admin.reset()
    engine.reset()
    return { ok: true }
  }],
]

const compiled = routes.map(([method, path, handler]) => {
  const keys = []
  const re = new RegExp(`^${path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`)
  return { method, re, keys, handler }
})

/** http.js tarafından çağrılır. Gerçek ağ gecikmesini taklit eder. */
export async function mockRequest(method, path, { query = {}, body, token } = {}) {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 230))
  for (const r of compiled) {
    if (r.method !== method) continue
    const m = path.match(r.re)
    if (!m) continue
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
    // Derin kopya: bileşenler mock durumunu doğrudan değiştiremesin
    const result = await r.handler({ params, query, body, token })
    return result === undefined ? null : JSON.parse(JSON.stringify(result))
  }
  throw new MockError(404, `Mock rota bulunamadı: ${method} ${path}`)
}
