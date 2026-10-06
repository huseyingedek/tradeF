import { http } from '../http'

export const orderService = {
  /** query: { status: 'open'|'history', exchangeId?, symbol?, limit? } */
  list: (query) => http.get('/orders', query),
  /**
   * Emir gönder.
   * { exchangeId, symbol, side: 'buy'|'sell',
   *   type: 'market'|'limit'|'stop_market'|'stop_limit'|'trailing_stop'|'oco',
   *   qty, price?, stopPrice?, trailingPct?, leverage?, takeProfit?, stopLoss? }
   */
  place: (order) => http.post('/orders', order),
  cancel: (id) => http.del(`/orders/${id}`),
  cancelAll: (filter = {}) => http.post('/orders/cancel-all', filter),
}

export const positionService = {
  list: () => http.get('/positions'),
  close: (id, percent = 100) => http.post(`/positions/${id}/close`, { percent }),
  /** { stopLoss?, takeProfit? } – null göndermek kaldırır */
  update: (id, patch) => http.patch(`/positions/${id}`, patch),
}

export const portfolioService = {
  balances: () => http.get('/balances'),
  summary: () => http.get('/portfolio/summary'),
  /** range: '1D' | '1W' | '1M' | '3M' | '1Y' */
  history: (range = '1M') => http.get('/portfolio/history', { range }),
}
