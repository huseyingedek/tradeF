# Tradepilo – Backend API Sözleşmesi

Frontend tüm veriyi bu sözleşmeye göre bekler. Mock backend (`src/mock/`) da birebir aynı şekilleri döndürür.
Kendi API'niz farklıysa iki seçenek var:

1. Backend'i bu sözleşmeye uydurmak, **veya**
2. `src/api/services/*.js` içindeki ilgili fonksiyonda yolu/gövdeyi değiştirip dönen veriyi buradaki şekle çevirmek (normalize).

Sayfalar servisleri değil `src/api/queries.js`'teki hook'ları kullandığı için başka hiçbir dosyaya dokunmak gerekmez.

## Genel kurallar

- Taban adres: `VITE_API_URL` (örn. `https://api.ornek.com/v1`)
- Kimlik: `Authorization: Bearer <token>` (token `POST /auth/login` ile alınır)
- Gövde ve yanıtlar JSON. Yanıt `{ "data": ... }` zarfıyla da gelebilir; `http.js` zarfı otomatik açar.
- Zaman damgaları: **milisaniye** (Unix epoch). Mumlarda `time` **saniye**.
- Hata yanıtı: HTTP 4xx/5xx + `{ "message": "Türkçe açıklama", "code": "KILL_SWITCH", "details": {...} }`
  - `message` kullanıcıya toast olarak gösterilir.
  - 401 → oturum kapatılır.
- Önerilen hata kodları: `KILL_SWITCH`, `EXCHANGE_PAUSED`, `EXCHANGE_DOWN`, `INSUFFICIENT_FUNDS`, `RISK_LIMIT`, `AUTH_FAILED`.

## Veri tipleri

```ts
type Market = 'crypto' | 'bist' | 'forex'

type Provider = {           // desteklenen platform kataloğu
  id: string                // 'binance' | 'bybit' | 'okx' | 'kraken' | 'btcturk' | 'bist_broker' | 'oanda' | ...
  name: string; market: Market; color: string; textColor: string
  features: { spot: boolean; futures: boolean; short: boolean; oco: boolean; trailing: boolean }
  fields: { key: string; label: string; type: 'text' | 'password' }[]   // bağlantı formunda istenecek alanlar
}

type Connection = {         // kullanıcının bağladığı hesap
  id: string; provider: string; label: string; market: Market
  status: 'connected' | 'error' | 'disconnected'
  paused: boolean           // true → bu hesapta yeni emir/bot engelli
  testnet: boolean
  apiKeyMasked: string      // 'vF3k••••••••Qa91'  (secret ASLA dönülmez)
  permissions: string[]     // ['read','spot'] | ['read','futures'] ...  ('futures' varsa kaldıraç açılır)
  latencyMs: number | null; lastSyncAt: number; createdAt: number
  errorMessage?: string
}

type Instrument = { symbol: string; name: string; base: string; quote: string; market: Market; tickSize: number; qtyStep: number }

type Ticker = { symbol: string; last: number; open: number; high: number; low: number; change: number; changePct: number; volume: number; bid: number; ask: number; ts: number }

type Candle = { time: number /* saniye */; open: number; high: number; low: number; close: number; volume: number }

type OrderBook = { symbol: string; bids: [price: number, qty: number][]; asks: [number, number][]; ts: number }

type Trade = { id: string; price: number; qty: number; side: 'buy' | 'sell'; ts: number }

type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit' | 'trailing_stop' | 'oco'
type Order = {
  id: string; exchangeId: string; symbol: string; side: 'buy' | 'sell'; type: OrderType
  qty: number; price: number | null; stopPrice: number | null; trailingPct: number | null; leverage: number
  takeProfit: number | null; stopLoss: number | null
  status: 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected'
  filledQty: number; avgPrice: number | null; realizedPnl?: number | null; fee?: number
  source: 'manual' | 'rule' | 'bot' | 'system'; reason: string | null
  createdAt: number; filledAt?: number; canceledAt?: number
}

type Position = {           // spot varlıklar da long pozisyon olarak döner
  id: string; exchangeId: string; symbol: string; side: 'long' | 'short'
  qty: number; entryPrice: number; leverage: number; margin: number  // margin: kote para biriminde yatırılan tutar
  stopLoss: number | null; takeProfit: number | null; openedAt: number
}

type Balance = { exchangeId: string; asset: string; free: number; locked: number; total: number; available: number; valueUsd: number }

type PortfolioSummary = {
  baseCurrency: 'USD'; totalValue: number; cashValue: number; positionsValue: number; unrealizedPnl: number
  dayPnl: number; dayPnlPct: number
  allocation: { key: 'crypto' | 'bist' | 'forex' | 'cash'; label: string; value: number }[]
  byExchange: { exchangeId: string; value: number }[]
  ts: number
}

type Rule = {
  id: string; name: string; enabled: boolean; exchangeId: string | null; symbol: string | null
  trigger: { type: 'price_above' | 'price_below' | 'change_above' | 'change_below' | 'position_pnl_below' | 'portfolio_drawdown'; value: number }
  action: { type: 'notify' | 'market_buy' | 'market_sell' | 'close_position' | 'cancel_orders' | 'pause_exchange' | 'kill_switch'; qty?: number; percent?: number }
  repeat: 'once' | 'always'; cooldownSec: number
  triggerCount: number; lastTriggeredAt: number | null; createdAt: number
}

type Bot = {
  id: string; name: string; strategy: 'dca' | 'grid' | 'trailing'; exchangeId: string; symbol: string
  status: 'running' | 'paused' | 'stopped'
  config: { amount?, intervalHours?, takeProfitPct?, maxOrders?, lower?, upper?, grids?, trailingPct? }
  investment: number; pnl: number; trades: number; startedAt: number | null; pnlHistory: number[]
}

type Risk = {
  killSwitch: { active: boolean; reason: string | null; at: number | null; by: 'manual' | 'rule' | 'risk' | null }
  dailyLossLimit: { enabled: boolean; pct: number }
  maxPositionPct: number; maxOpenOrders: number; requireConfirm: boolean
  state: { totalValue; dayStartValue; dayPnl; dayPnlPct; lossLimitUsedPct; openOrders; runningBots; activeRules }
}

type ActivityEntry = {
  id: string; ts: number; level: 'info' | 'success' | 'warning' | 'danger'
  source: 'manual' | 'rule' | 'bot' | 'system' | 'risk'; message: string
  notify?: boolean          // true → frontend toast gösterir
  exchangeId?: string; symbol?: string; ruleId?: string; botId?: string
}

type User = { id: string; name: string; email: string; role: string; baseCurrency: string; twoFactor: boolean
  notifications: { app: boolean; email: boolean; telegram: boolean; telegramChatId: string } }
```

## REST uç noktaları

| Metot | Yol | Gövde / Sorgu | Yanıt |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/auth/register` | `{ name, email, password }` | `{ token, user }` |
| GET | `/auth/me` | | `User` |
| PATCH | `/auth/me` | `Partial<User>` | `User` |
| GET | `/providers` | | `Provider[]` |
| GET | `/exchanges` | | `Connection[]` |
| POST | `/exchanges` | `{ provider, label, credentials: {apiKey, apiSecret, ...}, testnet }` | `Connection` (bağlantı testi başarısızsa 400) |
| POST | `/exchanges/:id/test` | | `{ ok, latencyMs?, permissions?, message? }` |
| PATCH | `/exchanges/:id` | `{ label?, paused?, credentials? }` | `Connection` |
| DELETE | `/exchanges/:id` | | `{ ok }` (açık pozisyon varsa 409) |
| GET | `/markets/instruments` | `?market=` | `Instrument[]` |
| GET | `/markets/tickers` | `?symbols=BTC/USDT,THYAO` | `Ticker[]` |
| GET | `/markets/candles` | `?symbol=&interval=1m\|5m\|15m\|1h\|4h\|1d&limit=300` | `Candle[]` (eskiden yeniye) |
| GET | `/markets/orderbook` | `?symbol=&depth=14` | `OrderBook` |
| GET | `/markets/trades` | `?symbol=` | `Trade[]` (yeniden eskiye) |
| GET | `/orders` | `?status=open\|history&exchangeId=&symbol=&limit=` | `Order[]` (yeniden eskiye) |
| POST | `/orders` | `{ exchangeId, symbol, side, type, qty, price?, stopPrice?, trailingPct?, leverage?, takeProfit?, stopLoss? }` | `Order` |
| DELETE | `/orders/:id` | | `Order` |
| POST | `/orders/cancel-all` | `{ exchangeId?, symbol? }` | `{ canceled: number }` |
| GET | `/positions` | | `Position[]` |
| POST | `/positions/:id/close` | `{ percent: 1-100 }` | `Order` |
| PATCH | `/positions/:id` | `{ stopLoss: number\|null, takeProfit: number\|null }` | `Position` |
| GET | `/balances` | | `Balance[]` |
| GET | `/portfolio/summary` | | `PortfolioSummary` |
| GET | `/portfolio/history` | `?range=1D\|1W\|1M\|3M\|1Y` | `{ range, points: [ts, valueUsd][] }` |
| GET / POST | `/rules` | `Rule` (id'siz) | `Rule[]` / `Rule` |
| PATCH / DELETE | `/rules/:id` | `Partial<Rule>` | `Rule` / `{ ok }` |
| GET / POST | `/bots` | `{ name, strategy, exchangeId, symbol, investment, config, autoStart }` | `Bot[]` / `Bot` |
| POST | `/bots/:id/start` · `/pause` · `/stop` | | `Bot` |
| DELETE | `/bots/:id` | | `{ ok }` (çalışan bot silinemez → 409) |
| GET | `/risk` | | `Risk` |
| PATCH | `/risk` | `{ dailyLossLimit?, maxPositionPct?, maxOpenOrders?, requireConfirm? }` | `Risk` |
| POST | `/risk/kill-switch` | `{ active, reason?, cancelOrders?, closePositions? }` | `Risk` |
| GET | `/activity` | `?source=&level=&limit=` | `ActivityEntry[]` (yeniden eskiye) |

### Backend'in sorumlulukları (frontend varsayımları)

- **Kurallar ve botlar sunucuda çalışır.** Kullanıcı tarayıcıyı kapatsa da çalışmaya devam etmeli; frontend sadece CRUD yapar.
- **Kill switch** aktifken: yeni emir (manuel/kural/bot) reddedilir (`423 KILL_SWITCH`), çalışan botlar duraklatılır. SL/TP korumaları çalışmaya devam eder.
- **Hesap duraklatma** (`paused`): o hesapta yeni emir ve bot işlemi reddedilir (`409 EXCHANGE_PAUSED`).
- **Risk limitleri** (`maxPositionPct`, `maxOpenOrders`, günlük zarar limiti) sunucuda da doğrulanmalı.
- **API secret'ları** şifreli saklanmalı ve hiçbir yanıtta dönmemeli; yalnızca `apiKeyMasked`.
- Pozisyon SL/TP, borsa destekliyorsa borsaya koşullu emir olarak, desteklemiyorsa sunucu tarafında izlenmeli.

## WebSocket

Adres: `VITE_WS_URL?token=<token>`

İstemci → sunucu:
```json
{ "op": "subscribe",   "channel": "tickers" }
{ "op": "unsubscribe", "channel": "orderbook:BTC/USDT" }
{ "op": "ping" }
```

Sunucu → istemci:
```json
{ "channel": "tickers", "data": [ /* Ticker[] */ ] }
{ "op": "pong" }
```

| Kanal | `data` | Not |
|---|---|---|
| `tickers` | `Ticker[]` | Tüm semboller, ~1 sn'de bir |
| `orderbook:<SYMBOL>` | `OrderBook` | Tam görüntü (snapshot) |
| `trades:<SYMBOL>` | `Trade[]` | Sadece yeni işlemler |
| `candles:<SYMBOL>:<INTERVAL>` | `Candle` | Son (açık) mum; `time` değişince yeni mum |
| `orders`, `positions`, `balances`, `exchanges`, `rules`, `bots`, `risk` | herhangi / `null` | "Değişti" sinyali – frontend ilgili REST sorgusunu yeniler |
| `activity` | `ActivityEntry` | `notify: true` ise toast gösterilir |
| `portfolio` | `PortfolioSummary` | Doğrudan önbelleğe yazılır |

Bağlantı koparsa istemci üstel bekleme ile yeniden bağlanır ve tüm abonelikleri tekrar gönderir.

---

# Admin API

Admin paneli aynı backend'in `/admin/*` uç noktalarını kullanır. **Yetki kontrolü backend'de yapılmalıdır**; frontend'deki menü gizleme sadece kullanım kolaylığıdır.

## Admin girişi (zorunlu 2FA)

1. `POST /auth/login { email, password }` → admin hesabıysa `{ requires2fa: true, challengeId, method: 'totp' }`
2. `POST /auth/2fa { challengeId, code }` → `{ token, user: AdminUser }`

```ts
type AdminUser = { id; name; email; kind: 'admin'; role: 'super_admin' | 'risk' | 'support' | 'finance'; roleLabel: string
  permissions: string[]; status: 'active' | 'invited' | 'disabled'; twoFactor: boolean; lastActiveAt: number | null }
```

Frontend `user.kind === 'admin'` ise `/admin`'e, değilse `/dashboard`'a yönlendirir. `permissions` menüyü ve butonları belirler.

## Yetkiler (RBAC)

| İzin | Süper Admin | Risk | Destek | Finans |
|---|:-:|:-:|:-:|:-:|
| `overview.read` | ✓ | ✓ | ✓ | ✓ |
| `users.read` | ✓ | ✓ | ✓ | ✓ |
| `users.manage` (askıya alma, plan, oturum, 2FA) | ✓ | | ✓ | |
| `users.trading` (kullanıcı işlemlerini durdurma) | ✓ | ✓ | | |
| `risk.manage` (global durdurma, limitler) | ✓ | ✓ | | |
| `integrations.manage` | ✓ | ✓ | | |
| `billing.read` / `billing.manage` | ✓ | | | ✓ |
| `announcements.manage` | ✓ | | ✓ | |
| `audit.read` | ✓ | ✓ | | |
| `team.manage` | ✓ | | | |

Yetkisiz istek → `403 { code: 'FORBIDDEN' }`.

## Uç noktalar

| Metot | Yol | Gövde / Sorgu | Yanıt | İzin |
|---|---|---|---|---|
| GET | `/admin/overview` | | `Overview` (KPI, büyüme, hacim, plan dağılımı, sağlık, uyarılar, son audit) | overview.read |
| GET | `/admin/users` | `?q&plan&status&flagged&sort=field:asc\|desc&page&pageSize` | `{ items: AdminUserRow[], total, page, pageSize }` | users.read |
| GET | `/admin/users/:id` | | `{ user, connections, positions, orders, bots, rules, activity, sessions, payments, plan }` | users.read |
| PATCH | `/admin/users/:id` | `{ status?: 'active'\|'suspended'\|'trading_halted', reason?, plan? }` | `AdminUserRow` | users.manage / users.trading |
| POST | `/admin/users/:id/logout-all` | | `AdminUserRow` | users.manage |
| POST | `/admin/users/:id/reset-2fa` | `{ reason }` | `AdminUserRow` | users.manage |
| POST | `/admin/users/:id/resend-verification` | | | users.manage |
| POST | `/admin/users/:id/notes` | `{ text }` | `AdminUserRow` | users.read |
| GET / PATCH | `/admin/platform` | `{ maxLeverage?, maxOrderUsd?, blockedSymbols?, registrationOpen?, requireUser2fa?, maintenance?: { active, message } }` | `Platform` | risk.manage |
| POST | `/admin/platform/kill-switch` | `{ active, reason }` | `Platform` | risk.manage |
| GET | `/admin/providers` | | `{ providers: ProviderHealth[], incidents: Incident[] }` | overview.read |
| PATCH | `/admin/providers/:id` | `{ enabledForNew?, tradingHalted?, maintenance?, reason? }` | `ProviderHealth` | integrations.manage |
| GET / POST | `/admin/plans` | `Plan` | `Plan[]` (+ `subscribers`, `mrr`) | billing.read / manage |
| PATCH / DELETE | `/admin/plans/:id` | `Plan` | `Plan` / `{ ok }` (abonesi varsa 409) | billing.manage |
| GET | `/admin/payments` | `?status&plan&q&page&pageSize` | `{ items: Payment[], total, page, pageSize, monthly: {month, revenue, refunds}[] }` | billing.read |
| POST | `/admin/payments/:id/refund` | `{ reason }` | `Payment` | billing.manage |
| GET / POST | `/admin/announcements` | `Announcement` | `Announcement[]` | announcements.manage |
| PATCH / DELETE | `/admin/announcements/:id` | | | announcements.manage |
| GET | `/admin/audit` | `?actor&action=<önek>&q&limit` | `AuditEntry[]` | audit.read |
| GET / POST | `/admin/team` | `{ name, email, role }` | `{ admins, roles, permissions }` / `AdminUser` | overview.read / team.manage |
| PATCH / DELETE | `/admin/team/:id` | `{ role?, status? }` | `AdminUser` | team.manage |

Kullanıcı paneli için ek uç nokta:

| GET | `/announcements/active` | | `{ announcements: Announcement[], platform: { tradingHalted, haltReason, maintenance, haltedProviders, blockedSymbols, maxLeverage }, account: { status, plan } }` |

```ts
type Plan = { id; name; description; priceMonthly; priceYearly; currency: 'TRY'
  limits: { exchanges: number; bots: number; rules: number }   // -1 = sınırsız
  features: { futures; apiAccess; prioritySupport; telegram }; active: boolean; highlighted: boolean }
type Announcement = { id; title; message; level: 'info' | 'warning' | 'maintenance'; audience: 'all' | planId
  active: boolean; startsAt: number; endsAt: number | null; createdBy; createdAt }
type AuditEntry = { id; ts; actor: string; action: string /* 'user.suspend' ... */; target: string; details: string; ip: string }
type ProviderHealth = { id; name; market; status: 'operational' | 'degraded' | 'down' | 'maintenance'
  latencyP50; latencyP95; errorRatePct; rateLimitPct; uptime30d; accounts; latencyHistory: number[]
  enabledForNew: boolean; tradingHalted: boolean; maintenance: boolean }
```

## Backend için zorunlu kurallar

- **Her admin işlemi** `AuditEntry` olarak kaydedilmeli (değiştirilemez / silinemez tablo). Kritik işlemler `reason` ister.
- **Admin, kullanıcı adına emir veremez** ve API secret'larını göremez. Sadece durdurma / askıya alma yapabilir.
- Global durdurma, borsa bazında durdurma, yasaklı semboller, maks. kaldıraç / emir tutarı ve **plan limitleri** (borsa, bot, kural sayısı, vadeli izni) her emir ve oluşturma isteğinde backend'de uygulanmalı.
  - Hata kodları: `PLATFORM_HALT`, `MAINTENANCE`, `USER_HALT`, `ACCOUNT_SUSPENDED`, `PROVIDER_HALT`, `PROVIDER_CLOSED`, `SYMBOL_BLOCKED`, `LEVERAGE_LIMIT`, `PLATFORM_LIMIT`, `PLAN_LIMIT`.
- Admin oturumları kısa ömürlü olmalı, 2FA zorunlu, mümkünse IP kısıtlaması uygulanmalı.
