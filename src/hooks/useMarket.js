// Canlı piyasa verisi için hafif global store + hook'lar
import { useEffect, useState, useSyncExternalStore } from 'react'
import { realtime } from '../api/realtime'
import { marketService } from '../api/services'

const HISTORY_LEN = 60

// ------------------------------------------------------------ ticker store
const tickers = new Map()
const history = new Map()
const listeners = new Set()
let snapshot = []
let version = 0

export const tickerStore = {
  setMany(list) {
    if (!Array.isArray(list)) return
    for (const t of list) {
      const prev = tickers.get(t.symbol)
      tickers.set(t.symbol, { ...t, prevLast: prev?.last ?? t.last })
      const h = history.get(t.symbol) || []
      h.push(t.last)
      if (h.length > HISTORY_LEN) h.shift()
      history.set(t.symbol, h)
    }
    snapshot = [...tickers.values()]
    version++
    listeners.forEach((fn) => fn())
  },
  get: (symbol) => tickers.get(symbol),
  history: (symbol) => history.get(symbol) || [],
  all: () => snapshot,
  version: () => version,
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

/** Tek sembolün canlı ticker'ı */
export function useTicker(symbol) {
  return useSyncExternalStore(tickerStore.subscribe, () => (symbol ? tickers.get(symbol) : undefined))
}

/** Tüm ticker'lar (dizi) */
export function useTickers() {
  return useSyncExternalStore(tickerStore.subscribe, tickerStore.all)
}

/** Her ticker güncellemesinde artan sayaç – canlı hesaplamalar için */
export function useTickerVersion() {
  return useSyncExternalStore(tickerStore.subscribe, tickerStore.version)
}

/** Uygulama genelinde ticker akışını başlatır (AdminLayout içinde bir kez) */
export function useTickerFeed() {
  useEffect(() => {
    let alive = true
    marketService
      .tickers()
      .then((list) => alive && tickerStore.setMany(list))
      .catch(() => {})
    const off = realtime.subscribe('tickers', (list) => tickerStore.setMany(list))
    return () => {
      alive = false
      off()
    }
  }, [])
}

// ------------------------------------------------------------ emir defteri
export function useOrderBook(symbol, depth = 14) {
  const [book, setBook] = useState(null)
  useEffect(() => {
    if (!symbol) return
    let alive = true
    setBook(null)
    marketService
      .orderBook(symbol, depth)
      .then((b) => alive && setBook(b))
      .catch(() => {})
    const off = realtime.subscribe(`orderbook:${symbol}`, (b) => alive && setBook(b))
    return () => {
      alive = false
      off()
    }
  }, [symbol, depth])
  return book
}

// ------------------------------------------------------------ son işlemler
export function useRecentTrades(symbol, max = 30) {
  const [trades, setTrades] = useState([])
  useEffect(() => {
    if (!symbol) return
    let alive = true
    setTrades([])
    marketService
      .trades(symbol)
      .then((t) => alive && setTrades(t.slice(0, max)))
      .catch(() => {})
    const off = realtime.subscribe(`trades:${symbol}`, (fresh) => alive && setTrades((t) => [...fresh, ...t].slice(0, max)))
    return () => {
      alive = false
      off()
    }
  }, [symbol, max])
  return trades
}

// ------------------------------------------------------------ bağlantı durumu
export function useRealtimeStatus() {
  return useSyncExternalStore(
    (fn) => realtime.onStatus(fn),
    () => realtime.status,
  )
}
