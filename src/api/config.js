// =====================================================================
//  API YAPILANDIRMASI
//  .env dosyasından okunur (bkz. .env.example)
// =====================================================================
const env = import.meta.env

/** "/ws" gibi göreli adresi sayfanın adresine göre ws(s)://alanadi/ws yapar (site ve API aynı alan adındaysa) */
function resolveWs(url) {
  if (!url.startsWith('/') || typeof window === 'undefined') return url
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${url}`
}

export const config = {
  /** REST API kök adresi: tam adres (https://api.ornek.com/api/v1) veya aynı alan adı için göreli (/api/v1) */
  apiUrl: (env.VITE_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, ''),
  /** WebSocket adresi: tam adres (wss://api.ornek.com/ws) veya göreli (/ws) */
  wsUrl: resolveWs(env.VITE_WS_URL || 'ws://localhost:8080/ws'),
  /** Sadece VITE_USE_MOCK=true iken istekler tarayıcı içindeki mock backend'e gider (varsayılan: gerçek API) */
  useMock: env.VITE_USE_MOCK === 'true',
  /** İstek zaman aşımı (ms) */
  timeoutMs: Number(env.VITE_API_TIMEOUT || 15000),
}
