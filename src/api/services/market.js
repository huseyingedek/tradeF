import { http } from '../http'

// Piyasa verisi (anlık akış için ayrıca realtime kanalları kullanılır)
export const marketService = {
  instruments: (market) => http.get('/markets/instruments', { market }),
  tickers: (symbols) => http.get('/markets/tickers', { symbols: symbols?.join(',') }),
  candles: (symbol, interval = '1h', limit = 300) => http.get('/markets/candles', { symbol, interval, limit }),
  orderBook: (symbol, depth = 14) => http.get('/markets/orderbook', { symbol, depth }),
  trades: (symbol) => http.get('/markets/trades', { symbol }),
}
