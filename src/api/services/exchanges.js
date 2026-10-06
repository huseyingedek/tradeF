import { http } from '../http'

// Borsa / aracı kurum bağlantıları
export const exchangeService = {
  /** Desteklenen platform kataloğu → Provider[] */
  providers: () => http.get('/providers'),
  /** Kullanıcının bağlı hesapları → Connection[] */
  list: () => http.get('/exchanges'),
  /** { provider, label, credentials: {...}, testnet } → Connection */
  create: (data) => http.post('/exchanges', data),
  /** → { ok, latencyMs?, permissions?, message? } */
  test: (id) => http.post(`/exchanges/${id}/test`),
  /** { label?, paused?, credentials? } → Connection */
  update: (id, patch) => http.patch(`/exchanges/${id}`, patch),
  remove: (id) => http.del(`/exchanges/${id}`),
}
