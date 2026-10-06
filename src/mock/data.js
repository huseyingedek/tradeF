// =====================================================================
//  MOCK SEED VERİSİ
//  Gerçek backend bağlandığında bu dosya kullanılmaz (VITE_USE_MOCK=false).
//  Şekiller (shape) docs/API.md içindeki sözleşmeyle birebir aynıdır.
// =====================================================================

const H = 3600_000
const now = Date.now()

/** Desteklenen platformlar (borsa / aracı kurum sağlayıcıları) */
export const providers = [
  {
    id: 'binance', name: 'Binance', market: 'crypto', color: '#f0b90b', textColor: '#1e2329',
    features: { spot: true, futures: true, short: false, oco: true, trailing: true },
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
    docsUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072',
  },
  {
    id: 'bybit', name: 'Bybit', market: 'crypto', color: '#17181e', textColor: '#f7a600',
    features: { spot: true, futures: true, short: true, oco: false, trailing: true },
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
  },
  {
    id: 'okx', name: 'OKX', market: 'crypto', color: '#2b2b2b', textColor: '#ffffff',
    features: { spot: true, futures: true, short: true, oco: true, trailing: true },
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'apiSecret', label: 'Secret Key', type: 'password' },
      { key: 'passphrase', label: 'Passphrase', type: 'password' },
    ],
  },
  {
    id: 'kraken', name: 'Kraken', market: 'crypto', color: '#5741d9', textColor: '#ffffff',
    features: { spot: true, futures: false, short: false, oco: false, trailing: true },
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'apiSecret', label: 'Private Key', type: 'password' },
    ],
  },
  {
    id: 'btcturk', name: 'BtcTurk', market: 'crypto', color: '#1c6ed8', textColor: '#ffffff',
    features: { spot: true, futures: false, short: false, oco: false, trailing: false },
    fields: [
      { key: 'apiKey', label: 'Public Key', type: 'text' },
      { key: 'apiSecret', label: 'Private Key', type: 'password' },
    ],
  },
  {
    id: 'bist_broker', name: 'BIST Aracı Kurum', market: 'bist', color: '#e30a17', textColor: '#ffffff',
    features: { spot: true, futures: false, short: false, oco: false, trailing: false },
    fields: [
      { key: 'customerNo', label: 'Müşteri No', type: 'text' },
      { key: 'apiKey', label: 'API Anahtarı', type: 'text' },
      { key: 'apiSecret', label: 'API Şifresi', type: 'password' },
    ],
  },
  {
    id: 'oanda', name: 'OANDA', market: 'forex', color: '#0a7c3e', textColor: '#ffffff',
    features: { spot: true, futures: false, short: true, oco: true, trailing: true },
    fields: [
      { key: 'accountId', label: 'Hesap ID', type: 'text' },
      { key: 'apiKey', label: 'API Token', type: 'password' },
    ],
  },
  {
    id: 'custom_rest', name: 'Özel Entegrasyon', market: 'crypto', color: '#6c757d', textColor: '#ffffff',
    features: { spot: true, futures: false, short: false, oco: false, trailing: false },
    fields: [
      { key: 'baseUrl', label: 'API Base URL', type: 'text' },
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
  },
]

/** Enstrümanlar – `price` sadece mock simülasyonun başlangıç fiyatıdır */
export const instruments = [
  // Kripto
  { symbol: 'BTC/USDT', name: 'Bitcoin', base: 'BTC', quote: 'USDT', market: 'crypto', tickSize: 0.01, qtyStep: 0.0001, price: 64250, vol: 0.0009 },
  { symbol: 'ETH/USDT', name: 'Ethereum', base: 'ETH', quote: 'USDT', market: 'crypto', tickSize: 0.01, qtyStep: 0.001, price: 3120, vol: 0.0011 },
  { symbol: 'SOL/USDT', name: 'Solana', base: 'SOL', quote: 'USDT', market: 'crypto', tickSize: 0.01, qtyStep: 0.01, price: 148.2, vol: 0.0014 },
  { symbol: 'BNB/USDT', name: 'BNB', base: 'BNB', quote: 'USDT', market: 'crypto', tickSize: 0.01, qtyStep: 0.001, price: 585.4, vol: 0.0009 },
  { symbol: 'XRP/USDT', name: 'XRP', base: 'XRP', quote: 'USDT', market: 'crypto', tickSize: 0.0001, qtyStep: 1, price: 0.5432, vol: 0.0013 },
  { symbol: 'AVAX/USDT', name: 'Avalanche', base: 'AVAX', quote: 'USDT', market: 'crypto', tickSize: 0.01, qtyStep: 0.01, price: 27.84, vol: 0.0015 },
  { symbol: 'DOGE/USDT', name: 'Dogecoin', base: 'DOGE', quote: 'USDT', market: 'crypto', tickSize: 0.00001, qtyStep: 1, price: 0.12541, vol: 0.0016 },
  { symbol: 'ADA/USDT', name: 'Cardano', base: 'ADA', quote: 'USDT', market: 'crypto', tickSize: 0.0001, qtyStep: 1, price: 0.3612, vol: 0.0014 },
  // BIST
  { symbol: 'THYAO', name: 'Türk Hava Yolları', base: 'THYAO', quote: 'TRY', market: 'bist', tickSize: 0.05, qtyStep: 1, price: 286.5, vol: 0.0006 },
  { symbol: 'ASELS', name: 'Aselsan', base: 'ASELS', quote: 'TRY', market: 'bist', tickSize: 0.05, qtyStep: 1, price: 62.4, vol: 0.0007 },
  { symbol: 'GARAN', name: 'Garanti BBVA', base: 'GARAN', quote: 'TRY', market: 'bist', tickSize: 0.05, qtyStep: 1, price: 118.9, vol: 0.0007 },
  { symbol: 'BIMAS', name: 'BİM Mağazalar', base: 'BIMAS', quote: 'TRY', market: 'bist', tickSize: 0.25, qtyStep: 1, price: 521, vol: 0.0005 },
  { symbol: 'EREGL', name: 'Ereğli Demir Çelik', base: 'EREGL', quote: 'TRY', market: 'bist', tickSize: 0.01, qtyStep: 1, price: 47.82, vol: 0.0006 },
  { symbol: 'KCHOL', name: 'Koç Holding', base: 'KCHOL', quote: 'TRY', market: 'bist', tickSize: 0.1, qtyStep: 1, price: 189.6, vol: 0.0005 },
  { symbol: 'SISE', name: 'Şişecam', base: 'SISE', quote: 'TRY', market: 'bist', tickSize: 0.01, qtyStep: 1, price: 41.22, vol: 0.0006 },
  { symbol: 'AKBNK', name: 'Akbank', base: 'AKBNK', quote: 'TRY', market: 'bist', tickSize: 0.05, qtyStep: 1, price: 58.7, vol: 0.0007 },
  // Forex / emtia
  { symbol: 'EUR/USD', name: 'Euro / Dolar', base: 'EUR', quote: 'USD', market: 'forex', tickSize: 0.00001, qtyStep: 1000, price: 1.0852, vol: 0.00012 },
  { symbol: 'GBP/USD', name: 'Sterlin / Dolar', base: 'GBP', quote: 'USD', market: 'forex', tickSize: 0.00001, qtyStep: 1000, price: 1.2731, vol: 0.00014 },
  { symbol: 'USD/TRY', name: 'Dolar / TL', base: 'USD', quote: 'TRY', market: 'forex', tickSize: 0.0001, qtyStep: 1000, price: 42.35, vol: 0.00008 },
  { symbol: 'USD/JPY', name: 'Dolar / Yen', base: 'USD', quote: 'JPY', market: 'forex', tickSize: 0.001, qtyStep: 1000, price: 149.21, vol: 0.00012 },
  { symbol: 'XAU/USD', name: 'Altın (ons)', base: 'XAU', quote: 'USD', market: 'forex', tickSize: 0.01, qtyStep: 1, price: 2652.4, vol: 0.0003 },
]

export const connections = [
  { id: 'cx_binance', provider: 'binance', label: 'Binance Ana Hesap', market: 'crypto', status: 'connected', paused: false, testnet: false, apiKeyMasked: 'vF3k••••••••Qa91', permissions: ['read', 'spot'], latencyMs: 42, lastSyncAt: now - 20_000, createdAt: now - 90 * 24 * H, credentialsValid: true },
  { id: 'cx_bybit', provider: 'bybit', label: 'Bybit Vadeli', market: 'crypto', status: 'connected', paused: false, testnet: false, apiKeyMasked: 'Tt8p••••••••3LmZ', permissions: ['read', 'futures'], latencyMs: 67, lastSyncAt: now - 35_000, createdAt: now - 40 * 24 * H, credentialsValid: true },
  { id: 'cx_bist', provider: 'bist_broker', label: 'Hisse Hesabı', market: 'bist', status: 'connected', paused: false, testnet: false, apiKeyMasked: '7781••••••••0042', permissions: ['read', 'spot'], latencyMs: 88, lastSyncAt: now - 60_000, createdAt: now - 120 * 24 * H, credentialsValid: true },
  { id: 'cx_oanda', provider: 'oanda', label: 'Forex Hesabı', market: 'forex', status: 'error', paused: false, testnet: true, apiKeyMasked: 'a1b2••••••••ff09', permissions: ['read'], latencyMs: null, lastSyncAt: now - 26 * H, createdAt: now - 200 * 24 * H, credentialsValid: false, errorMessage: '401 Unauthorized – API anahtarı geçersiz veya süresi dolmuş' },
  { id: 'cx_okx', provider: 'okx', label: 'OKX Yedek', market: 'crypto', status: 'connected', paused: true, testnet: false, apiKeyMasked: 'Ok55••••••••x7Pe', permissions: ['read', 'spot'], latencyMs: 54, lastSyncAt: now - 5 * 60_000, createdAt: now - 15 * 24 * H, credentialsValid: true },
]

/** Nakit bakiyeler (borsa başına, kote para birimi) */
export const balances = [
  { exchangeId: 'cx_binance', asset: 'USDT', free: 12500 },
  { exchangeId: 'cx_bybit', asset: 'USDT', free: 8200 },
  { exchangeId: 'cx_bist', asset: 'TRY', free: 85000 },
  { exchangeId: 'cx_oanda', asset: 'USD', free: 5000 },
  { exchangeId: 'cx_okx', asset: 'USDT', free: 1500 },
]

/** Pozisyonlar (spot varlıklar da long pozisyon olarak tutulur). margin = yatırılan tutar */
export const positions = [
  { id: 'ps_1', exchangeId: 'cx_binance', symbol: 'BTC/USDT', side: 'long', qty: 0.42, entryPrice: 58200, leverage: 1, stopLoss: 55000, takeProfit: null, openedAt: now - 30 * 24 * H },
  { id: 'ps_2', exchangeId: 'cx_binance', symbol: 'ETH/USDT', side: 'long', qty: 3.1, entryPrice: 2950, leverage: 1, stopLoss: null, takeProfit: 3600, openedAt: now - 21 * 24 * H },
  { id: 'ps_3', exchangeId: 'cx_binance', symbol: 'SOL/USDT', side: 'long', qty: 40, entryPrice: 162, leverage: 1, stopLoss: null, takeProfit: null, openedAt: now - 9 * 24 * H },
  { id: 'ps_4', exchangeId: 'cx_bybit', symbol: 'BTC/USDT', side: 'long', qty: 0.1, entryPrice: 62800, leverage: 5, stopLoss: 60500, takeProfit: 68000, openedAt: now - 3 * 24 * H },
  { id: 'ps_5', exchangeId: 'cx_bybit', symbol: 'ETH/USDT', side: 'short', qty: 1.5, entryPrice: 3180, leverage: 3, stopLoss: 3350, takeProfit: null, openedAt: now - 2 * 24 * H },
  { id: 'ps_6', exchangeId: 'cx_bist', symbol: 'THYAO', side: 'long', qty: 200, entryPrice: 270.4, leverage: 1, stopLoss: null, takeProfit: null, openedAt: now - 45 * 24 * H },
  { id: 'ps_7', exchangeId: 'cx_bist', symbol: 'ASELS', side: 'long', qty: 1000, entryPrice: 58.1, leverage: 1, stopLoss: 54, takeProfit: null, openedAt: now - 60 * 24 * H },
  { id: 'ps_8', exchangeId: 'cx_bist', symbol: 'GARAN', side: 'long', qty: 300, entryPrice: 124, leverage: 1, stopLoss: null, takeProfit: null, openedAt: now - 12 * 24 * H },
].map((p) => ({ ...p, margin: (p.qty * p.entryPrice) / p.leverage }))

const order = (o) => ({
  filledQty: 0, avgPrice: null, price: null, stopPrice: null, trailingPct: null, takeProfit: null, stopLoss: null,
  source: 'manual', reason: null, ...o,
})

export const orders = [
  order({ id: 'od_1', exchangeId: 'cx_binance', symbol: 'BTC/USDT', side: 'buy', type: 'limit', qty: 0.05, price: 61500, status: 'open', createdAt: now - 5 * H }),
  order({ id: 'od_2', exchangeId: 'cx_binance', symbol: 'SOL/USDT', side: 'sell', type: 'stop_market', qty: 20, stopPrice: 138, status: 'open', createdAt: now - 26 * H }),
  order({ id: 'od_3', exchangeId: 'cx_binance', symbol: 'ETH/USDT', side: 'sell', type: 'trailing_stop', qty: 1, trailingPct: 3, status: 'open', createdAt: now - 3 * H, peak: 3120 }),
  order({ id: 'od_4', exchangeId: 'cx_bist', symbol: 'THYAO', side: 'sell', type: 'limit', qty: 100, price: 300, status: 'open', createdAt: now - 50 * H }),
  order({ id: 'od_5', exchangeId: 'cx_bybit', symbol: 'ETH/USDT', side: 'sell', type: 'market', qty: 1.5, status: 'filled', filledQty: 1.5, avgPrice: 3180, createdAt: now - 48 * H, filledAt: now - 48 * H }),
  order({ id: 'od_6', exchangeId: 'cx_bybit', symbol: 'BTC/USDT', side: 'buy', type: 'limit', qty: 0.1, price: 62800, status: 'filled', filledQty: 0.1, avgPrice: 62800, createdAt: now - 80 * H, filledAt: now - 72 * H }),
  order({ id: 'od_7', exchangeId: 'cx_binance', symbol: 'XRP/USDT', side: 'buy', type: 'limit', qty: 2000, price: 0.48, status: 'canceled', createdAt: now - 100 * H, canceledAt: now - 90 * H }),
  order({ id: 'od_8', exchangeId: 'cx_bist', symbol: 'GARAN', side: 'buy', type: 'market', qty: 300, status: 'filled', filledQty: 300, avgPrice: 124, createdAt: now - 288 * H, filledAt: now - 288 * H }),
  order({ id: 'od_9', exchangeId: 'cx_binance', symbol: 'AVAX/USDT', side: 'sell', type: 'oco', qty: 50, price: 34, stopPrice: 25, status: 'filled', filledQty: 50, avgPrice: 34.02, createdAt: now - 400 * H, filledAt: now - 300 * H, realizedPnl: 212.5, source: 'rule' }),
  order({ id: 'od_10', exchangeId: 'cx_binance', symbol: 'BTC/USDT', side: 'buy', type: 'market', qty: 0.0016, status: 'filled', filledQty: 0.0016, avgPrice: 63850, createdAt: now - 20 * H, filledAt: now - 20 * H, source: 'bot' }),
]

export const rules = [
  {
    id: 'rl_1', name: 'BTC zarar kes', enabled: true, exchangeId: 'cx_binance', symbol: 'BTC/USDT',
    trigger: { type: 'price_below', value: 60000 }, action: { type: 'market_sell', percent: 50 },
    repeat: 'once', cooldownSec: 0, triggerCount: 0, lastTriggeredAt: null, createdAt: now - 10 * 24 * H,
  },
  {
    id: 'rl_2', name: 'ETH fiyat alarmı', enabled: true, exchangeId: 'cx_binance', symbol: 'ETH/USDT',
    trigger: { type: 'price_above', value: 3300 }, action: { type: 'notify' },
    repeat: 'always', cooldownSec: 3600, triggerCount: 3, lastTriggeredAt: now - 6 * 24 * H, createdAt: now - 30 * 24 * H,
  },
  {
    id: 'rl_3', name: 'Portföy koruması', enabled: true, exchangeId: null, symbol: null,
    trigger: { type: 'portfolio_drawdown', value: -4 }, action: { type: 'kill_switch' },
    repeat: 'once', cooldownSec: 0, triggerCount: 0, lastTriggeredAt: null, createdAt: now - 60 * 24 * H,
  },
  {
    id: 'rl_4', name: 'THYAO kâr al', enabled: false, exchangeId: 'cx_bist', symbol: 'THYAO',
    trigger: { type: 'price_above', value: 300 }, action: { type: 'market_sell', qty: 100 },
    repeat: 'once', cooldownSec: 0, triggerCount: 0, lastTriggeredAt: null, createdAt: now - 4 * 24 * H,
  },
  {
    id: 'rl_5', name: 'SOL sert düşüş uyarısı', enabled: true, exchangeId: 'cx_binance', symbol: 'SOL/USDT',
    trigger: { type: 'change_below', value: -6 }, action: { type: 'notify' },
    repeat: 'always', cooldownSec: 7200, triggerCount: 1, lastTriggeredAt: now - 9 * 24 * H, createdAt: now - 20 * 24 * H,
  },
]

const hist = (n, end, vol) => {
  const a = [end]
  for (let i = 1; i < n; i++) a.unshift(a[0] - (Math.random() - 0.4) * vol)
  return a.map((v) => Math.round(v * 100) / 100)
}

export const bots = [
  {
    id: 'bt_1', name: 'BTC Haftalık DCA', strategy: 'dca', exchangeId: 'cx_binance', symbol: 'BTC/USDT', status: 'running',
    config: { amount: 100, intervalHours: 24, takeProfitPct: 8, maxOrders: 30 }, investment: 2000, pnl: 184.2, trades: 23,
    startedAt: now - 23 * 24 * H, pnlHistory: hist(40, 184.2, 12),
  },
  {
    id: 'bt_2', name: 'ETH Grid', strategy: 'grid', exchangeId: 'cx_bybit', symbol: 'ETH/USDT', status: 'running',
    config: { lower: 2800, upper: 3400, grids: 20 }, investment: 3000, pnl: 96.5, trades: 57,
    startedAt: now - 8 * 24 * H, pnlHistory: hist(40, 96.5, 9),
  },
  {
    id: 'bt_3', name: 'SOL Grid', strategy: 'grid', exchangeId: 'cx_binance', symbol: 'SOL/USDT', status: 'paused',
    config: { lower: 130, upper: 180, grids: 15 }, investment: 1500, pnl: -42.3, trades: 18,
    startedAt: now - 14 * 24 * H, pnlHistory: hist(40, -42.3, 7),
  },
  {
    id: 'bt_4', name: 'THYAO Kademeli Alım', strategy: 'dca', exchangeId: 'cx_bist', symbol: 'THYAO', status: 'stopped',
    config: { amount: 5000, intervalHours: 168, takeProfitPct: 12, maxOrders: 10 }, investment: 50000, pnl: 3240, trades: 10,
    startedAt: now - 70 * 24 * H, pnlHistory: hist(40, 3240, 260),
  },
]

export const risk = {
  killSwitch: { active: false, reason: null, at: null, by: null },
  dailyLossLimit: { enabled: true, pct: 5 },
  maxPositionPct: 30,
  maxOpenOrders: 25,
  requireConfirm: true,
}

const act = (minsAgo, level, source, message, extra = {}) => ({ id: `ac_seed_${minsAgo}`, ts: now - minsAgo * 60_000, level, source, message, ...extra })
export const activity = [
  act(4, 'info', 'bot', 'ETH Grid: 3.112,40 seviyesinden 0,05 ETH satıldı', { exchangeId: 'cx_bybit', symbol: 'ETH/USDT' }),
  act(18, 'success', 'system', 'Binance Ana Hesap senkronize edildi', { exchangeId: 'cx_binance' }),
  act(55, 'warning', 'system', 'Forex Hesabı bağlantı hatası: 401 Unauthorized', { exchangeId: 'cx_oanda' }),
  act(130, 'info', 'manual', 'THYAO 100 lot limit satış emri girildi @ 300,00', { exchangeId: 'cx_bist', symbol: 'THYAO' }),
  act(180, 'info', 'manual', 'ETH/USDT 1 adet iz süren stop (%3) emri girildi', { exchangeId: 'cx_binance', symbol: 'ETH/USDT' }),
  act(300, 'info', 'manual', 'BTC/USDT 0,05 limit alış emri girildi @ 61.500,00', { exchangeId: 'cx_binance', symbol: 'BTC/USDT' }),
  act(720, 'success', 'bot', 'BTC Haftalık DCA: 0,0016 BTC alındı @ 63.850,00', { exchangeId: 'cx_binance', symbol: 'BTC/USDT' }),
  act(1440, 'warning', 'risk', 'OKX Yedek hesabında işlemler duraklatıldı', { exchangeId: 'cx_okx' }),
]

export const user = {
  id: 'u_1',
  name: 'Deniz Kaya',
  email: 'demo@tradepilo.com',
  role: 'Yatırımcı',
  baseCurrency: 'USD',
  notifications: { app: true, email: true, telegram: false, telegramChatId: '' },
  twoFactor: true,
}
