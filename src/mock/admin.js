// =====================================================================
//  MOCK ADMIN BACKEND
//  Platform yöneticisi tarafı: kullanıcılar, planlar, ödemeler,
//  entegrasyon sağlığı, platform riski, duyurular, denetim günlüğü, ekip.
//  Kullanıcı paneliyle bağlantılıdır: global durdurma, yasaklı semboller,
//  kaldıraç limiti, kullanıcı askıya alma ve plan limitleri engine'e
//  "guard" olarak eklenir.
// =====================================================================
import { engine, MockError } from './engine'
import { providers } from './data'

const STORE_KEY = 'tn-mock-admin-v1'
const DAY = 86_400_000
const now = Date.now()

// --------------------------------------------------------------- RBAC
export const PERMISSIONS = {
  'overview.read': 'Genel bakışı görüntüleme',
  'users.read': 'Kullanıcıları görüntüleme',
  'users.manage': 'Kullanıcı askıya alma / plan değiştirme / oturum kapatma',
  'users.trading': 'Kullanıcının işlemlerini durdurma',
  'risk.manage': 'Platform riski ve global durdurma',
  'integrations.manage': 'Entegrasyonları yönetme',
  'billing.read': 'Abonelik ve ödemeleri görüntüleme',
  'billing.manage': 'Plan düzenleme / iade',
  'announcements.manage': 'Duyuru yayınlama',
  'audit.read': 'Denetim günlüğünü görüntüleme',
  'team.manage': 'Admin ekibini ve rolleri yönetme',
}
export const ROLES = {
  super_admin: { label: 'Süper Admin', color: 'red', permissions: Object.keys(PERMISSIONS) },
  risk: { label: 'Risk Görevlisi', color: 'yellow', permissions: ['overview.read', 'users.read', 'users.trading', 'risk.manage', 'integrations.manage', 'audit.read'] },
  support: { label: 'Destek', color: 'sky', permissions: ['overview.read', 'users.read', 'users.manage', 'announcements.manage'] },
  finance: { label: 'Finans', color: 'green', permissions: ['overview.read', 'users.read', 'billing.read', 'billing.manage'] },
}

// --------------------------------------------------------------- deterministik rastgele
function rng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
const weighted = (r, entries) => {
  const total = entries.reduce((a, [, w]) => a + w, 0)
  let x = r() * total
  for (const [v, w] of entries) if ((x -= w) <= 0) return v
  return entries[0][0]
}
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// --------------------------------------------------------------- seed
const PLANS = [
  { id: 'free', name: 'Ücretsiz', priceMonthly: 0, priceYearly: 0, currency: 'TRY', limits: { exchanges: 1, bots: 1, rules: 3 }, features: { futures: false, apiAccess: false, prioritySupport: false, telegram: false }, active: true, highlighted: false, sortOrder: 1, description: 'Denemek isteyenler için tek hesap, temel alarmlar.' },
  { id: 'starter', name: 'Başlangıç', priceMonthly: 399, priceYearly: 3990, currency: 'TRY', limits: { exchanges: 2, bots: 5, rules: 15 }, features: { futures: false, apiAccess: false, prioritySupport: false, telegram: true }, active: true, highlighted: false, sortOrder: 2, description: 'Spot işlem yapan bireysel yatırımcı.' },
  { id: 'pro', name: 'Pro', priceMonthly: 999, priceYearly: 9990, currency: 'TRY', limits: { exchanges: 5, bots: 25, rules: 100 }, features: { futures: true, apiAccess: false, prioritySupport: true, telegram: true }, active: true, highlighted: true, sortOrder: 3, description: 'Birden fazla borsa, vadeli işlem ve otomasyon.' },
  { id: 'expert', name: 'Uzman', priceMonthly: 2499, priceYearly: 24990, currency: 'TRY', limits: { exchanges: 15, bots: 200, rules: -1 }, features: { futures: true, apiAccess: true, prioritySupport: true, telegram: true }, active: true, highlighted: false, sortOrder: 4, description: 'Yoğun otomasyon, API erişimi, sınırsız kural.' },
]

const FIRST = ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Elif', 'Can', 'Zeynep', 'Burak', 'Selin', 'Emre', 'Derya', 'Kerem', 'Ece', 'Mert', 'İrem', 'Onur', 'Naz', 'Tolga', 'Defne', 'Arda', 'Buse', 'Kaan', 'Melis', 'Umut', 'Gizem', 'Barış', 'Cem', 'Deniz', 'Oğuz', 'Seda', 'Yusuf', 'Hande', 'Serkan', 'Pınar', 'Volkan', 'Esra']
const LAST = ['Yılmaz', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Erdoğan', 'Yıldız', 'Aksoy', 'Güneş', 'Bulut', 'Keskin']
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Kocaeli', 'Konya', 'Eskişehir', 'Gaziantep', 'Mersin', 'Kayseri', 'Samsun']
const DEVICES = ['Chrome · Windows', 'Safari · iPhone', 'Chrome · Android', 'Edge · Windows', 'Safari · macOS', 'Firefox · Linux']
const ascii = (s) => s.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')

function seedUsers() {
  const r = rng(42)
  const users = []
  for (let i = 0; i < 148; i++) {
    const first = pick(r, FIRST)
    const last = pick(r, LAST)
    const plan = weighted(r, [['free', 55], ['starter', 25], ['pro', 15], ['expert', 5]])
    const ageDays = Math.floor(Math.pow(r(), 1.6) * 300) // yeni kayıtlar daha yoğun
    const status = weighted(r, [['active', 91], ['suspended', 4], ['trading_halted', 3], ['pending', 2]])
    const planLimits = PLANS.find((p) => p.id === plan).limits
    const exchanges = Math.max(status === 'pending' ? 0 : 1, Math.min(planLimits.exchanges, Math.floor(r() * (planLimits.exchanges + 1))))
    const aum = exchanges ? Math.round(Math.exp(7 + r() * (plan === 'expert' ? 6 : plan === 'pro' ? 5 : 4))) : 0
    const flags = []
    if (r() < 0.05) flags.push('Çok sayıda hatalı giriş denemesi')
    if (r() < 0.03) flags.push('Olağandışı büyük emir')
    if (r() < 0.02) flags.push('Farklı ülkeden giriş')
    users.push({
      id: `u_${1000 + i}`,
      name: `${first} ${last}`,
      email: `${ascii(first)}.${ascii(last)}${i}@mail.com`,
      plan,
      billing: r() < 0.3 ? 'yearly' : 'monthly',
      status,
      city: pick(r, CITIES),
      createdAt: now - ageDays * DAY - Math.floor(r() * DAY),
      lastLoginAt: status === 'pending' ? null : now - Math.floor(Math.pow(r(), 2) * 20 * DAY),
      twoFactor: r() < (plan === 'free' ? 0.3 : 0.75),
      exchanges,
      bots: exchanges ? Math.min(planLimits.bots, Math.floor(r() * (planLimits.bots + 1))) : 0,
      rules: exchanges ? Math.floor(r() * Math.min(20, planLimits.rules === -1 ? 20 : planLimits.rules + 1)) : 0,
      aumUsd: aum,
      volume30dUsd: Math.round(aum * (0.3 + r() * 6)),
      riskFlags: flags,
      notes: [],
    })
  }
  // Demo kullanıcı – kullanıcı panelindeki gerçek (mock) veriye bağlı
  users.unshift({
    id: 'u_1', name: 'Deniz Kaya', email: 'demo@tradepilo.com', plan: 'expert', billing: 'monthly', status: 'active', city: 'İstanbul',
    createdAt: now - 210 * DAY, lastLoginAt: now - 60_000, twoFactor: true, exchanges: 5, bots: 4, rules: 5, aumUsd: 0, volume30dUsd: 412_000,
    riskFlags: [], notes: [{ id: 'n1', text: 'Uzman plana yıllık geçiş için indirim talep etti.', by: 'Mert Kaya', at: now - 12 * DAY }], isDemo: true,
  })
  return users
}

function seedPayments(users) {
  const r = rng(7)
  const list = []
  users.filter((u) => u.plan !== 'free' && u.status !== 'pending').forEach((u) => {
    const plan = PLANS.find((p) => p.id === u.plan)
    // Fatura tarihleri: kayıt tarihinden itibaren her dönem (aylık 30g / yıllık 365g); son 6 ay
    const step = (u.billing === 'yearly' ? 365 : 30) * DAY
    const dates = []
    for (let t = u.createdAt; t <= now; t += step) if (t > now - 183 * DAY || u.billing === 'yearly') dates.push(t)
    dates.forEach((createdAt, m) => {
      const status = weighted(r, [['paid', 93], ['failed', 4], ['refunded', 3]])
      list.push({
        id: `pay_${u.id}_${m}`,
        userId: u.id, userName: u.name, plan: u.plan, billing: u.billing,
        amount: u.billing === 'yearly' ? plan.priceYearly : plan.priceMonthly, currency: 'TRY',
        status, method: pick(r, ['Kredi kartı', 'Kredi kartı', 'Banka kartı', 'Havale/EFT']),
        createdAt,
        failureReason: status === 'failed' ? pick(r, ['Yetersiz bakiye', 'Kart reddedildi', '3D Secure doğrulanamadı']) : null,
      })
    })
  })
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

const ADMINS = [
  { id: 'ad_1', name: 'Hüseyin Gedek', email: 'admin@tradepilo.com', role: 'super_admin', status: 'active', twoFactor: true, lastActiveAt: now - 2 * 60_000, createdAt: now - 400 * DAY },
  { id: 'ad_2', name: 'Ece Yalçın', email: 'risk@tradepilo.com', role: 'risk', status: 'active', twoFactor: true, lastActiveAt: now - 3 * 3600_000, createdAt: now - 200 * DAY },
  { id: 'ad_3', name: 'Mert Kaya', email: 'destek@tradepilo.com', role: 'support', status: 'active', twoFactor: true, lastActiveAt: now - 26 * 3600_000, createdAt: now - 150 * DAY },
  { id: 'ad_4', name: 'Selin Aksoy', email: 'finans@tradepilo.com', role: 'finance', status: 'active', twoFactor: true, lastActiveAt: now - 4 * DAY, createdAt: now - 90 * DAY },
]

const audit = (minsAgo, actor, action, target, details, ip = '85.105.12.44') => ({ id: `au_seed_${minsAgo}_${action}`, ts: now - minsAgo * 60_000, actor, action, target, details, ip })
const AUDIT = [
  audit(35, 'Ece Yalçın', 'provider.update', 'OANDA', 'Yeni bağlantılar geçici olarak kapatıldı (yüksek hata oranı)', '78.180.4.21'),
  audit(95, 'Mert Kaya', 'user.reset_2fa', 'Zeynep Arslan', 'Telefon kaybı sonrası 2FA sıfırlandı', '88.230.19.7'),
  audit(240, 'Hüseyin Gedek', 'announcement.create', 'Planlı bakım', 'Tüm kullanıcılara duyuru yayınlandı'),
  audit(600, 'Ece Yalçın', 'user.trading_halt', 'Kaan Polat', 'Olağandışı büyük emir sonrası işlemler durduruldu', '78.180.4.21'),
  audit(1500, 'Selin Aksoy', 'payment.refund', 'Burak Demir', '₺999 iade edildi (çift çekim)', '95.70.140.3'),
  audit(2900, 'Hüseyin Gedek', 'plan.update', 'Pro', 'Bot limiti 20 → 25', '85.105.12.44'),
  audit(4300, 'Mert Kaya', 'user.suspend', 'Onur Yıldız', 'Şüpheli giriş denemeleri – hesap askıya alındı', '88.230.19.7'),
  audit(7200, 'Hüseyin Gedek', 'risk.update', 'Platform', 'Maks. kaldıraç 20x → 10x'),
  audit(10100, 'Hüseyin Gedek', 'team.invite', 'Selin Aksoy', 'Finans rolüyle davet edildi'),
]

const ANNOUNCEMENTS = [
  { id: 'an_1', title: 'Planlı bakım', message: 'Pazar 03:00–04:00 arasında kısa süreli bakım yapılacaktır. Bu sürede kurallar ve botlar çalışmaya devam eder, panel erişimi kesilebilir.', level: 'maintenance', audience: 'all', active: true, startsAt: now - 3600_000, endsAt: now + 4 * DAY, createdBy: 'Hüseyin Gedek', createdAt: now - 4 * 3600_000 },
  { id: 'an_2', title: 'Yeni: OKX vadeli desteği', message: 'Pro ve Uzman plan kullanıcıları artık OKX vadeli hesaplarını bağlayabilir.', level: 'info', audience: 'pro', active: false, startsAt: now - 20 * DAY, endsAt: now - 5 * DAY, createdBy: 'Hüseyin Gedek', createdAt: now - 20 * DAY },
]

function seedProviders() {
  return Object.fromEntries(
    providers.map((p) => [
      p.id,
      {
        id: p.id,
        enabledForNew: p.id !== 'oanda',
        tradingHalted: false,
        maintenance: false,
        base: { binance: 45, bybit: 62, okx: 58, kraken: 120, btcturk: 70, bist_broker: 90, oanda: 260, custom_rest: 150 }[p.id] || 80,
        errBase: { oanda: 7.5, kraken: 1.8 }[p.id] ?? 0.3,
      },
    ]),
  )
}

// --------------------------------------------------------------- store
class AdminStore {
  constructor() {
    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
    } catch {
      saved = null
    }
    if (saved) this.db = saved
    else {
      const users = seedUsers()
      this.db = {
        users,
        plans: PLANS,
        payments: seedPayments(users),
        admins: ADMINS,
        audit: AUDIT,
        announcements: ANNOUNCEMENTS,
        providers: seedProviders(),
        platform: {
          killSwitch: { active: false, reason: null, at: null, by: null },
          maintenance: { active: false, message: '' },
          registrationOpen: true,
          maxLeverage: 10,
          maxOrderUsd: 50000,
          blockedSymbols: [],
          requireUser2fa: false,
        },
        incidents: [
          { id: 'in_1', provider: 'oanda', title: 'OANDA API yüksek hata oranı', status: 'investigating', startedAt: now - 50 * 60_000, resolvedAt: null },
          { id: 'in_2', provider: 'kraken', title: 'Kraken gecikme artışı', status: 'resolved', startedAt: now - 2 * DAY, resolvedAt: now - 2 * DAY + 90 * 60_000 },
        ],
      }
    }
    this.challenges = new Map()
    this.currentAdmin = null
    this.installGuards()
  }

  save() {
    clearTimeout(this.t)
    this.t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.db))
      } catch {
        /* yoksay */
      }
    }, 300)
  }

  reset() {
    try {
      localStorage.removeItem(STORE_KEY)
    } catch {
      /* yoksay */
    }
    Object.assign(this, new AdminStore())
  }

  // ------------------------------------------------- kullanıcı paneline etkiler
  installGuards() {
    if (engine.__adminGuards) return
    engine.__adminGuards = true
    engine.tradeGuards.push(({ instrument, provider, body }) => {
      const s = globalThis.__tnAdmin.db
      const p = s.platform
      if (p.killSwitch.active) throw new MockError(423, `Platform genelinde işlemler durduruldu: ${p.killSwitch.reason}`, 'PLATFORM_HALT')
      if (p.maintenance.active) throw new MockError(503, 'Platform bakımda, emir girişi geçici olarak kapalı', 'MAINTENANCE')
      const demo = s.users.find((u) => u.id === 'u_1')
      if (demo?.status === 'suspended') throw new MockError(403, 'Hesabınız askıya alındı', 'ACCOUNT_SUSPENDED')
      if (demo?.status === 'trading_halted') throw new MockError(423, 'Hesabınızda işlemler yönetici tarafından durduruldu', 'USER_HALT')
      if (s.providers[provider.id]?.tradingHalted) throw new MockError(423, `${provider.name} üzerinde işlemler geçici olarak durduruldu`, 'PROVIDER_HALT')
      if (p.blockedSymbols.includes(instrument.symbol)) throw new MockError(403, `${instrument.symbol} platformda işleme kapalı`, 'SYMBOL_BLOCKED')
      if (body.leverage && +body.leverage > p.maxLeverage) throw new MockError(422, `Maksimum kaldıraç ${p.maxLeverage}x`, 'LEVERAGE_LIMIT')
      const plan = s.plans.find((x) => x.id === demo?.plan)
      if (plan && !plan.features.futures && body.leverage > 1) throw new MockError(403, `${plan.name} planında vadeli/kaldıraçlı işlem yok`, 'PLAN_LIMIT')
      const px = +body.price || +body.stopPrice || engine.last(instrument.symbol)
      const usd = engine.toUsd(+body.qty * px, instrument.quote)
      if (usd > p.maxOrderUsd) throw new MockError(422, `Platform limiti: tek emir en fazla $${p.maxOrderUsd.toLocaleString('tr-TR')}`, 'PLATFORM_LIMIT')
    })
    engine.connectionGuards.push(({ provider }) => {
      const s = globalThis.__tnAdmin.db
      const pr = s.providers[provider.id]
      if (pr && (!pr.enabledForNew || pr.maintenance)) throw new MockError(503, `${provider.name} için yeni bağlantılar geçici olarak kapalı`, 'PROVIDER_CLOSED')
      const demo = s.users.find((u) => u.id === 'u_1')
      const plan = s.plans.find((x) => x.id === demo?.plan)
      if (plan && plan.limits.exchanges !== -1 && engine.db.connections.length >= plan.limits.exchanges)
        throw new MockError(403, `${plan.name} planı en fazla ${plan.limits.exchanges} borsa hesabına izin veriyor. Planınızı yükseltin.`, 'PLAN_LIMIT')
    })
  }

  /** Kural/bot oluşturmada plan limiti */
  checkPlanLimit(kind) {
    const demo = this.db.users.find((u) => u.id === 'u_1')
    const plan = this.db.plans.find((x) => x.id === demo?.plan)
    if (!plan) return
    const limit = plan.limits[kind]
    const used = kind === 'bots' ? engine.db.bots.length : engine.db.rules.length
    if (limit !== -1 && used >= limit) throw new MockError(403, `${plan.name} planı en fazla ${limit} ${kind === 'bots' ? 'bot' : 'kural'} oluşturmaya izin veriyor`, 'PLAN_LIMIT')
  }

  // ------------------------------------------------- auth
  adminLoginStart(email) {
    const a = this.db.admins.find((x) => x.email.toLowerCase() === email.toLowerCase())
    if (!a) return null
    if (a.status !== 'active') throw new MockError(403, 'Admin hesabı aktif değil')
    const challengeId = uid('ch')
    this.challenges.set(challengeId, a.id)
    return { requires2fa: true, challengeId, method: 'totp' }
  }
  adminLoginVerify(challengeId, code) {
    const id = this.challenges.get(challengeId)
    if (!id) throw new MockError(401, 'Doğrulama süresi doldu, tekrar giriş yapın')
    if (!/^\d{6}$/.test(code || '')) throw new MockError(401, 'Doğrulama kodu 6 haneli olmalı')
    this.challenges.delete(challengeId)
    const a = this.db.admins.find((x) => x.id === id)
    a.lastActiveAt = Date.now()
    this.currentAdmin = a
    this.log('admin.login', a.name, 'Başarılı admin girişi (2FA)')
    return { token: `mock-admin.${a.id}.${Date.now().toString(36)}`, user: this.adminView(a) }
  }
  adminView(a) {
    return { ...a, kind: 'admin', roleLabel: ROLES[a.role].label, permissions: ROLES[a.role].permissions }
  }
  actor(token) {
    const id = token?.split('.')[1]
    const a = this.db.admins.find((x) => x.id === id) || this.currentAdmin || this.db.admins[0]
    return a
  }
  require(token, perm) {
    const a = this.actor(token)
    if (!ROLES[a.role].permissions.includes(perm)) throw new MockError(403, 'Bu işlem için yetkiniz yok', 'FORBIDDEN')
    return a
  }

  log(action, target, details, actorName) {
    const entry = { id: uid('au'), ts: Date.now(), actor: actorName || this.currentAdmin?.name || 'Sistem', action, target, details, ip: '85.105.12.44' }
    this.db.audit.unshift(entry)
    if (this.db.audit.length > 500) this.db.audit.length = 500
    this.save()
    return entry
  }

  // ------------------------------------------------- kullanıcı görünümü
  demoAum() {
    try {
      return Math.round(engine.totalValueUsd())
    } catch {
      return 0
    }
  }
  userRow(u) {
    if (!u.isDemo) return u
    return { ...u, aumUsd: this.demoAum(), exchanges: engine.db.connections.length, bots: engine.db.bots.length, rules: engine.db.rules.length }
  }
  listUsers(q) {
    let list = this.db.users.map((u) => this.userRow(u))
    const term = (q.q || '').trim().toLocaleLowerCase('tr-TR')
    if (term) list = list.filter((u) => `${u.name} ${u.email} ${u.id}`.toLocaleLowerCase('tr-TR').includes(term))
    if (q.plan) list = list.filter((u) => u.plan === q.plan)
    if (q.status) list = list.filter((u) => u.status === q.status)
    if (q.flagged === 'true') list = list.filter((u) => u.riskFlags.length)
    const [key, dir] = (q.sort || 'createdAt:desc').split(':')
    list.sort((a, b) => {
      const va = a[key] ?? 0
      const vb = b[key] ?? 0
      const v = typeof va === 'string' ? va.localeCompare(vb, 'tr') : va - vb
      return dir === 'asc' ? v : -v
    })
    const page = Math.max(1, +q.page || 1)
    const size = Math.min(100, +q.pageSize || 20)
    return { items: list.slice((page - 1) * size, page * size), total: list.length, page, pageSize: size }
  }

  userDetail(id) {
    const u = this.db.users.find((x) => x.id === id)
    if (!u) throw new MockError(404, 'Kullanıcı bulunamadı')
    const r = rng(parseInt(id.replace(/\D/g, ''), 10) || 1)
    const row = this.userRow(u)
    let connections, positions, orders, bots, rules, activity
    if (u.isDemo) {
      connections = engine.db.connections.map(({ credentialsValid, ...c }) => (void credentialsValid, c))
      positions = engine.db.positions.map((p) => ({ ...p, ...engine.positionMetrics(p) }))
      orders = engine.db.orders.slice(0, 15)
      bots = engine.db.bots.map(({ pnlHistory, ...b }) => (void pnlHistory, b))
      rules = engine.db.rules
      activity = engine.db.activity.slice(0, 25)
    } else {
      const provs = providers.filter((p) => p.market === 'crypto').slice(0, 5)
      connections = Array.from({ length: u.exchanges }, (_, i) => {
        const p = i === 0 ? pick(r, provs) : pick(r, providers.slice(0, 7))
        return { id: `${id}_cx${i}`, provider: p.id, label: `${p.name} hesabı`, market: p.market, status: r() < 0.9 ? 'connected' : 'error', paused: r() < 0.08, apiKeyMasked: `${Math.floor(r() * 9000 + 1000)}••••••••${Math.floor(r() * 9000 + 1000)}`, permissions: ['read', 'spot'], latencyMs: Math.round(40 + r() * 90), createdAt: u.createdAt + Math.floor(r() * 20) * DAY }
      })
      positions = []
      orders = []
      bots = []
      rules = []
      activity = Array.from({ length: Math.min(12, 3 + u.bots + u.rules) }, (_, i) => ({
        id: `${id}_ac${i}`, ts: now - i * Math.floor(2 + r() * 20) * 3600_000, level: pick(r, ['info', 'info', 'success', 'warning']), source: pick(r, ['manual', 'rule', 'bot', 'system']),
        message: pick(r, ['BTC/USDT limit alış emri girildi', 'Grid botu 0,02 ETH sattı', 'Fiyat alarmı tetiklendi', 'Binance hesabı senkronize edildi', 'SOL/USDT pozisyonu kapatıldı', 'Yeni kural oluşturuldu']),
      }))
    }
    const sessions = Array.from({ length: u.status === 'pending' ? 0 : 1 + Math.floor(r() * 3) }, (_, i) => ({
      id: `${id}_s${i}`, device: pick(r, DEVICES), ip: `${Math.floor(r() * 200 + 20)}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}`, city: i === 0 ? u.city : pick(r, CITIES), lastSeenAt: (u.lastLoginAt || now) - i * Math.floor(r() * 3 * DAY), current: i === 0,
    }))
    const payments = this.db.payments.filter((p) => p.userId === id)
    return { user: row, connections, positions, orders, bots, rules, activity, sessions: u.sessionsRevoked ? [] : sessions, payments, plan: this.db.plans.find((p) => p.id === u.plan) }
  }

  updateUser(token, id, patch) {
    const u = this.db.users.find((x) => x.id === id)
    if (!u) throw new MockError(404, 'Kullanıcı bulunamadı')
    const changes = []
    if (patch.status && patch.status !== u.status) {
      if (patch.status === 'trading_halted' || (u.status === 'trading_halted' && patch.status === 'active')) this.require(token, 'users.trading')
      else this.require(token, 'users.manage')
      if (!['active', 'suspended', 'trading_halted'].includes(patch.status)) throw new MockError(400, 'Geçersiz durum')
      const reason = (patch.reason || '').trim()
      if (patch.status !== 'active' && reason.length < 5) throw new MockError(400, 'İşlem gerekçesi en az 5 karakter olmalı')
      const action = { suspended: 'user.suspend', trading_halted: 'user.trading_halt', active: u.status === 'suspended' ? 'user.reactivate' : 'user.trading_resume' }[patch.status]
      u.status = patch.status
      changes.push([action, reason || 'Hesap yeniden etkinleştirildi'])
      if (u.isDemo && patch.status !== 'active') {
        engine.db.bots.forEach((b) => b.status === 'running' && (b.status = 'paused'))
        engine.log('danger', 'risk', patch.status === 'suspended' ? 'Hesabınız yönetici tarafından askıya alındı' : `İşlemleriniz yönetici tarafından durduruldu: ${reason}`, {}, true)
        engine.emit('bots', null)
      }
      if (u.isDemo && patch.status === 'active') engine.log('success', 'risk', 'Hesabınız yönetici tarafından yeniden etkinleştirildi', {}, true)
    }
    if (patch.plan && patch.plan !== u.plan) {
      this.require(token, 'users.manage')
      const plan = this.db.plans.find((p) => p.id === patch.plan)
      if (!plan) throw new MockError(400, 'Plan bulunamadı')
      changes.push(['user.plan_change', `${u.plan} → ${plan.id}`])
      u.plan = plan.id
    }
    changes.forEach(([a, d]) => this.log(a, u.name, d, this.actor(token).name))
    this.save()
    return this.userRow(u)
  }

  userAction(token, id, action, body = {}) {
    const u = this.db.users.find((x) => x.id === id)
    if (!u) throw new MockError(404, 'Kullanıcı bulunamadı')
    const actor = this.require(token, action === 'note' ? 'users.read' : 'users.manage')
    if (action === 'logout-all') {
      u.sessionsRevoked = true
      this.log('user.logout_all', u.name, 'Tüm oturumlar sonlandırıldı', actor.name)
    } else if (action === 'reset-2fa') {
      u.twoFactor = false
      this.log('user.reset_2fa', u.name, body.reason || '2FA sıfırlandı', actor.name)
    } else if (action === 'note') {
      if (!(body.text || '').trim()) throw new MockError(400, 'Not boş olamaz')
      u.notes.unshift({ id: uid('n'), text: body.text.trim(), by: actor.name, at: Date.now() })
      this.log('user.note', u.name, 'Not eklendi', actor.name)
    } else if (action === 'resend-verification') {
      this.log('user.verify_email', u.name, 'Doğrulama e-postası yeniden gönderildi', actor.name)
    }
    this.save()
    return this.userRow(u)
  }

  // ------------------------------------------------- genel bakış
  overview() {
    const users = this.db.users.map((u) => this.userRow(u))
    const day = (n) => now - n * DAY
    const active24 = users.filter((u) => u.lastLoginAt && u.lastLoginAt > day(1)).length
    const new7 = users.filter((u) => u.createdAt > day(7)).length
    const new7prev = users.filter((u) => u.createdAt > day(14) && u.createdAt <= day(7)).length
    const paid = users.filter((u) => u.plan !== 'free' && u.status !== 'pending')
    const mrr = paid.reduce((a, u) => {
      const p = this.db.plans.find((x) => x.id === u.plan)
      return a + (u.billing === 'yearly' ? p.priceYearly / 12 : p.priceMonthly)
    }, 0)
    const growth = Array.from({ length: 90 }, (_, i) => {
      const t = day(89 - i)
      return [t, users.filter((u) => u.createdAt <= t).length]
    })
    const r = rng(Math.floor(now / DAY))
    const volume = Array.from({ length: 30 }, (_, i) => ({ t: day(29 - i), crypto: Math.round(2.2e6 + r() * 1.6e6 + i * 4e4), bist: Math.round(6e5 + r() * 4e5), forex: Math.round(2e5 + r() * 2e5) }))
    const health = this.providerHealth()
    const signups = Array.from({ length: 14 }, (_, i) => [day(13 - i), users.filter((u) => u.createdAt > day(14 - i) && u.createdAt <= day(13 - i)).length])
    return {
      kpis: {
        totalUsers: users.length,
        activeUsers24h: active24,
        newUsers7d: new7,
        newUsers7dChangePct: new7prev ? ((new7 - new7prev) / new7prev) * 100 : 0,
        paidUsers: paid.length,
        conversionPct: (paid.length / users.length) * 100,
        mrr: Math.round(mrr),
        currency: 'TRY',
        connectedAccounts: users.reduce((a, u) => a + u.exchanges, 0),
        aumUsd: users.reduce((a, u) => a + u.aumUsd, 0),
        volume24hUsd: volume.at(-1).crypto + volume.at(-1).bist + volume.at(-1).forex,
        runningBots: users.reduce((a, u) => a + Math.round(u.bots * 0.7), 0),
        activeRules: users.reduce((a, u) => a + u.rules, 0),
        errorRatePct: health.reduce((a, h) => a + h.errorRatePct * h.accounts, 0) / Math.max(1, health.reduce((a, h) => a + h.accounts, 0)),
      },
      growth,
      signups,
      volume,
      planDistribution: this.db.plans.map((p) => ({ plan: p.id, name: p.name, count: users.filter((u) => u.plan === p.id).length })),
      health,
      alerts: users.filter((u) => u.riskFlags.length).slice(0, 8).map((u) => ({ userId: u.id, userName: u.name, flags: u.riskFlags, status: u.status })),
      failedPayments: this.db.payments.filter((p) => p.status === 'failed' && p.createdAt > day(30)).length,
      recentAudit: this.db.audit.slice(0, 8),
      platform: this.db.platform,
    }
  }

  // ------------------------------------------------- entegrasyon sağlığı
  providerHealth() {
    const users = this.db.users
    const t = Math.floor(Date.now() / 5000)
    return providers.map((p, idx) => {
      const s = this.db.providers[p.id]
      const r = rng(t * 31 + idx)
      const accounts = Math.round(users.reduce((a, u) => a + u.exchanges, 0) * ({ binance: 0.38, bybit: 0.17, okx: 0.1, kraken: 0.05, btcturk: 0.12, bist_broker: 0.11, oanda: 0.05, custom_rest: 0.02 }[p.id] || 0.02))
      const err = Math.max(0, s.errBase * (0.7 + r() * 0.6))
      const p50 = Math.round(s.base * (0.85 + r() * 0.3))
      const status = s.maintenance ? 'maintenance' : err > 5 ? 'down' : err > 1.5 || p50 > 200 ? 'degraded' : 'operational'
      const hr = rng(idx + 99)
      return {
        id: p.id, name: p.name, market: p.market, color: p.color, textColor: p.textColor,
        status, latencyP50: p50, latencyP95: Math.round(p50 * (1.8 + r())), errorRatePct: +err.toFixed(2), rateLimitPct: Math.round(15 + r() * (p.id === 'binance' ? 55 : 35)),
        accounts, enabledForNew: s.enabledForNew, tradingHalted: s.tradingHalted, maintenance: s.maintenance,
        latencyHistory: Array.from({ length: 30 }, () => Math.round(s.base * (0.75 + hr() * 0.6) + (s.errBase > 5 ? hr() * 200 : 0))),
        uptime30d: +(100 - s.errBase * 0.08 - hr() * 0.05).toFixed(2),
      }
    })
  }

  updateProvider(token, id, patch) {
    const actor = this.require(token, 'integrations.manage')
    const s = this.db.providers[id]
    if (!s) throw new MockError(404, 'Platform bulunamadı')
    const name = providers.find((p) => p.id === id).name
    for (const k of ['enabledForNew', 'tradingHalted', 'maintenance']) {
      if (patch[k] === undefined || patch[k] === s[k]) continue
      s[k] = !!patch[k]
      const txt = {
        enabledForNew: s[k] ? 'Yeni bağlantılara açıldı' : 'Yeni bağlantılara kapatıldı',
        tradingHalted: s[k] ? 'Tüm kullanıcılar için işlemler durduruldu' : 'İşlemler yeniden açıldı',
        maintenance: s[k] ? 'Bakım moduna alındı' : 'Bakım modu kapatıldı',
      }[k]
      this.log(k === 'tradingHalted' ? (s[k] ? 'provider.halt' : 'provider.resume') : 'provider.update', name, `${txt}${patch.reason ? ` – ${patch.reason}` : ''}`, actor.name)
      if (k === 'tradingHalted') engine.log(s[k] ? 'danger' : 'success', 'risk', `${name}: ${s[k] ? 'platform yöneticisi işlemleri geçici olarak durdurdu' : 'işlemler yeniden açıldı'}`, {}, true)
    }
    this.save()
    return this.providerHealth().find((h) => h.id === id)
  }

  // ------------------------------------------------- platform riski
  updatePlatform(token, patch) {
    const actor = this.require(token, 'risk.manage')
    const p = this.db.platform
    const changes = []
    if (patch.maxLeverage !== undefined) {
      const v = Math.round(+patch.maxLeverage)
      if (!(v >= 1 && v <= 125)) throw new MockError(400, 'Kaldıraç 1–125 arasında olmalı')
      if (v !== p.maxLeverage) changes.push(`Maks. kaldıraç ${p.maxLeverage}x → ${v}x`)
      p.maxLeverage = v
    }
    if (patch.maxOrderUsd !== undefined) {
      const v = +patch.maxOrderUsd
      if (!(v >= 10)) throw new MockError(400, 'Maks. emir tutarı geçersiz')
      if (v !== p.maxOrderUsd) changes.push(`Maks. emir $${p.maxOrderUsd} → $${v}`)
      p.maxOrderUsd = v
    }
    if (patch.blockedSymbols) {
      const added = patch.blockedSymbols.filter((s) => !p.blockedSymbols.includes(s))
      const removed = p.blockedSymbols.filter((s) => !patch.blockedSymbols.includes(s))
      if (added.length) changes.push(`İşleme kapatılan: ${added.join(', ')}`)
      if (removed.length) changes.push(`İşleme açılan: ${removed.join(', ')}`)
      p.blockedSymbols = [...patch.blockedSymbols]
    }
    if (patch.registrationOpen !== undefined && patch.registrationOpen !== p.registrationOpen) {
      p.registrationOpen = !!patch.registrationOpen
      changes.push(`Yeni kayıt ${p.registrationOpen ? 'açıldı' : 'kapatıldı'}`)
    }
    if (patch.requireUser2fa !== undefined && patch.requireUser2fa !== p.requireUser2fa) {
      p.requireUser2fa = !!patch.requireUser2fa
      changes.push(`Kullanıcılar için 2FA ${p.requireUser2fa ? 'zorunlu' : 'isteğe bağlı'}`)
    }
    if (patch.maintenance) {
      const m = { active: !!patch.maintenance.active, message: patch.maintenance.message || '' }
      if (m.active !== p.maintenance.active) changes.push(`Bakım modu ${m.active ? 'açıldı' : 'kapatıldı'}`)
      p.maintenance = m
    }
    if (changes.length) this.log('risk.update', 'Platform', changes.join(' · '), actor.name)
    this.save()
    return p
  }

  platformKill(token, { active, reason }) {
    const actor = this.require(token, 'risk.manage')
    const p = this.db.platform
    if (active) {
      if ((reason || '').trim().length < 5) throw new MockError(400, 'Gerekçe en az 5 karakter olmalı')
      p.killSwitch = { active: true, reason: reason.trim(), at: Date.now(), by: actor.name }
      engine.db.bots.forEach((b) => b.status === 'running' && (b.status = 'paused'))
      engine.emit('bots', null)
      engine.log('danger', 'risk', `Platform genelinde işlemler durduruldu: ${reason.trim()}`, {}, true)
      this.log('risk.platform_halt', 'Platform', `GLOBAL DURDURMA – ${reason.trim()}`, actor.name)
    } else {
      p.killSwitch = { active: false, reason: null, at: null, by: null }
      engine.log('success', 'risk', 'Platform genelinde işlemler yeniden açıldı', {}, true)
      this.log('risk.platform_resume', 'Platform', 'Global durdurma kaldırıldı', actor.name)
    }
    this.save()
    return p
  }

  // ------------------------------------------------- planlar & ödemeler
  plansView() {
    return this.db.plans
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => {
        const subs = this.db.users.filter((u) => u.plan === p.id)
        return { ...p, subscribers: subs.length, mrr: Math.round(subs.reduce((a, u) => a + (u.billing === 'yearly' ? p.priceYearly / 12 : p.priceMonthly), 0)) }
      })
  }
  validatePlan(b) {
    if (!b.name?.trim()) throw new MockError(400, 'Plan adı gerekli')
    if (!(+b.priceMonthly >= 0) || !(+b.priceYearly >= 0)) throw new MockError(400, 'Fiyatlar 0 veya üzeri olmalı')
    for (const k of ['exchanges', 'bots', 'rules']) if (!(+b.limits?.[k] === -1 || +b.limits?.[k] >= 0)) throw new MockError(400, 'Limitler 0+ veya sınırsız (-1) olmalı')
  }
  savePlan(token, id, body) {
    const actor = this.require(token, 'billing.manage')
    this.validatePlan(body)
    const clean = {
      name: body.name.trim(), description: body.description || '', priceMonthly: +body.priceMonthly, priceYearly: +body.priceYearly, currency: 'TRY',
      limits: { exchanges: +body.limits.exchanges, bots: +body.limits.bots, rules: +body.limits.rules },
      features: { futures: !!body.features?.futures, apiAccess: !!body.features?.apiAccess, prioritySupport: !!body.features?.prioritySupport, telegram: !!body.features?.telegram },
      active: body.active !== false, highlighted: !!body.highlighted,
    }
    if (id) {
      const p = this.db.plans.find((x) => x.id === id)
      if (!p) throw new MockError(404, 'Plan bulunamadı')
      const diff = []
      if (p.priceMonthly !== clean.priceMonthly) diff.push(`aylık ₺${p.priceMonthly} → ₺${clean.priceMonthly}`)
      for (const k of ['exchanges', 'bots', 'rules']) if (p.limits[k] !== clean.limits[k]) diff.push(`${k} ${p.limits[k]} → ${clean.limits[k]}`)
      Object.assign(p, clean)
      this.log('plan.update', p.name, diff.join(' · ') || 'Plan güncellendi', actor.name)
      this.save()
      return p
    }
    const p = { ...clean, id: clean.name.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g, '-') || uid('plan'), sortOrder: this.db.plans.length + 1 }
    if (this.db.plans.some((x) => x.id === p.id)) p.id = uid('plan')
    this.db.plans.push(p)
    this.log('plan.create', p.name, `₺${p.priceMonthly}/ay`, actor.name)
    this.save()
    return p
  }
  deletePlan(token, id) {
    const actor = this.require(token, 'billing.manage')
    if (this.db.users.some((u) => u.plan === id)) throw new MockError(409, 'Bu planda aboneler var; önce planı pasifleştirin')
    const p = this.db.plans.find((x) => x.id === id)
    this.db.plans = this.db.plans.filter((x) => x.id !== id)
    this.log('plan.delete', p?.name || id, 'Plan silindi', actor.name)
    this.save()
    return { ok: true }
  }
  listPayments(q) {
    let list = this.db.payments
    if (q.status) list = list.filter((p) => p.status === q.status)
    if (q.plan) list = list.filter((p) => p.plan === q.plan)
    if (q.q) list = list.filter((p) => p.userName.toLocaleLowerCase('tr-TR').includes(q.q.toLocaleLowerCase('tr-TR')))
    const page = Math.max(1, +q.page || 1)
    const size = +q.pageSize || 20
    const month = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (5 - i))
      const start = d.getTime()
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      const inMonth = this.db.payments.filter((p) => p.createdAt >= start && p.createdAt < end)
      return { month: start, revenue: inMonth.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0), refunds: inMonth.filter((p) => p.status === 'refunded').reduce((a, p) => a + p.amount, 0) }
    })
    return { items: list.slice((page - 1) * size, page * size), total: list.length, page, pageSize: size, monthly: month }
  }
  refund(token, id, reason) {
    const actor = this.require(token, 'billing.manage')
    const p = this.db.payments.find((x) => x.id === id)
    if (!p) throw new MockError(404, 'Ödeme bulunamadı')
    if (p.status !== 'paid') throw new MockError(409, 'Sadece başarılı ödemeler iade edilebilir')
    if ((reason || '').trim().length < 5) throw new MockError(400, 'İade gerekçesi gerekli')
    p.status = 'refunded'
    this.log('payment.refund', p.userName, `₺${p.amount.toLocaleString('tr-TR')} iade – ${reason.trim()}`, actor.name)
    this.save()
    return p
  }

  // ------------------------------------------------- duyurular
  saveAnnouncement(token, id, b) {
    const actor = this.require(token, 'announcements.manage')
    if (!(b.title || '').trim() || !(b.message || '').trim()) throw new MockError(400, 'Başlık ve mesaj gerekli')
    if (!['info', 'warning', 'maintenance'].includes(b.level)) throw new MockError(400, 'Geçersiz seviye')
    const clean = { title: b.title.trim(), message: b.message.trim(), level: b.level, audience: b.audience || 'all', active: b.active !== false, startsAt: +b.startsAt || Date.now(), endsAt: b.endsAt ? +b.endsAt : null }
    if (clean.endsAt && clean.endsAt <= clean.startsAt) throw new MockError(400, 'Bitiş zamanı başlangıçtan sonra olmalı')
    if (id) {
      const a = this.db.announcements.find((x) => x.id === id)
      if (!a) throw new MockError(404, 'Duyuru bulunamadı')
      Object.assign(a, clean)
      this.log('announcement.update', a.title, a.active ? 'Yayında' : 'Yayından kaldırıldı', actor.name)
      this.save()
      return a
    }
    const a = { ...clean, id: uid('an'), createdBy: actor.name, createdAt: Date.now() }
    this.db.announcements.unshift(a)
    this.log('announcement.create', a.title, `Hedef: ${a.audience === 'all' ? 'tüm kullanıcılar' : `${a.audience} planı`}`, actor.name)
    this.save()
    return a
  }
  deleteAnnouncement(token, id) {
    const actor = this.require(token, 'announcements.manage')
    const a = this.db.announcements.find((x) => x.id === id)
    this.db.announcements = this.db.announcements.filter((x) => x.id !== id)
    this.log('announcement.delete', a?.title || id, 'Duyuru silindi', actor.name)
    this.save()
    return { ok: true }
  }
  /** Kullanıcı paneli için: aktif duyurular + platform durumu */
  activeForUser() {
    const demo = this.db.users.find((u) => u.id === 'u_1')
    const t = Date.now()
    return {
      announcements: this.db.announcements.filter((a) => a.active && a.startsAt <= t && (!a.endsAt || a.endsAt > t) && (a.audience === 'all' || a.audience === demo?.plan)),
      platform: {
        tradingHalted: this.db.platform.killSwitch.active,
        haltReason: this.db.platform.killSwitch.reason,
        maintenance: this.db.platform.maintenance,
        haltedProviders: Object.values(this.db.providers).filter((p) => p.tradingHalted).map((p) => p.id),
        blockedSymbols: this.db.platform.blockedSymbols,
        maxLeverage: this.db.platform.maxLeverage,
      },
      account: { status: demo?.status, plan: this.db.plans.find((p) => p.id === demo?.plan) },
    }
  }

  // ------------------------------------------------- ekip
  teamView() {
    return { admins: this.db.admins.map((a) => this.adminView(a)), roles: ROLES, permissions: PERMISSIONS }
  }
  inviteAdmin(token, b) {
    const actor = this.require(token, 'team.manage')
    if (!(b.name || '').trim() || !/^\S+@\S+\.\S+$/.test(b.email || '')) throw new MockError(400, 'Ad ve geçerli e-posta gerekli')
    if (!ROLES[b.role]) throw new MockError(400, 'Geçersiz rol')
    if (this.db.admins.some((a) => a.email.toLowerCase() === b.email.toLowerCase())) throw new MockError(409, 'Bu e-posta zaten ekipte')
    const a = { id: uid('ad'), name: b.name.trim(), email: b.email.trim(), role: b.role, status: 'invited', twoFactor: false, lastActiveAt: null, createdAt: Date.now() }
    this.db.admins.push(a)
    this.log('team.invite', a.name, `${ROLES[a.role].label} rolüyle davet edildi`, actor.name)
    this.save()
    return this.adminView(a)
  }
  updateAdmin(token, id, b) {
    const actor = this.require(token, 'team.manage')
    const a = this.db.admins.find((x) => x.id === id)
    if (!a) throw new MockError(404, 'Admin bulunamadı')
    if (a.id === actor.id && b.role && b.role !== a.role) throw new MockError(409, 'Kendi rolünüzü değiştiremezsiniz')
    if (b.role && !ROLES[b.role]) throw new MockError(400, 'Geçersiz rol')
    if (b.role && b.role !== a.role) {
      if (a.role === 'super_admin' && this.db.admins.filter((x) => x.role === 'super_admin' && x.status === 'active').length <= 1) throw new MockError(409, 'En az bir aktif süper admin kalmalı')
      this.log('team.role_change', a.name, `${ROLES[a.role].label} → ${ROLES[b.role].label}`, actor.name)
      a.role = b.role
    }
    if (b.status && b.status !== a.status) {
      if (a.id === actor.id) throw new MockError(409, 'Kendi hesabınızı devre dışı bırakamazsınız')
      a.status = b.status
      this.log('team.status', a.name, b.status === 'disabled' ? 'Erişimi kapatıldı' : 'Erişimi açıldı', actor.name)
    }
    this.save()
    return this.adminView(a)
  }
  removeAdmin(token, id) {
    const actor = this.require(token, 'team.manage')
    if (id === actor.id) throw new MockError(409, 'Kendinizi silemezsiniz')
    const a = this.db.admins.find((x) => x.id === id)
    if (a?.role === 'super_admin') throw new MockError(409, 'Süper admin silinemez, önce rolünü değiştirin')
    this.db.admins = this.db.admins.filter((x) => x.id !== id)
    this.log('team.remove', a?.name || id, 'Ekipten çıkarıldı', actor.name)
    this.save()
    return { ok: true }
  }
}

export const admin = globalThis.__tnAdmin || (globalThis.__tnAdmin = new AdminStore())
