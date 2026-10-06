// =====================================================================
//  API YAPILANDIRMASI
//  .env dosyasından okunur (bkz. .env.example)
// =====================================================================
const env = import.meta.env

export const config = {
  /** REST API kök adresi, örn. https://api.ornek.com/v1 */
  apiUrl: (env.VITE_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, ''),
  /** WebSocket adresi, örn. wss://api.ornek.com/ws */
  wsUrl: env.VITE_WS_URL || 'ws://localhost:8080/ws',
  /** Sadece VITE_USE_MOCK=true iken istekler tarayıcı içindeki mock backend'e gider (varsayılan: gerçek API) */
  useMock: env.VITE_USE_MOCK === 'true',
  /** İstek zaman aşımı (ms) */
  timeoutMs: Number(env.VITE_API_TIMEOUT || 15000),
}
