// =====================================================================
//  REACT QUERY HOOK'LARI
//  Sayfalar veriye yalnızca bu hook'lar üzerinden erişir.
// =====================================================================
import { useEffect, useMemo } from 'react'
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activityService, authService, botService, exchangeService, marketService, orderService,
  portfolioService, positionService, riskService, ruleService,
} from './services'
import { realtime } from './realtime'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export const qk = {
  me: ['me'],
  providers: ['providers'],
  exchanges: ['exchanges'],
  instruments: ['instruments'],
  orders: (status) => ['orders', status],
  positions: ['positions'],
  balances: ['balances'],
  summary: (mode = 'auto') => ['portfolio', 'summary', mode],
  history: (range, mode = 'auto') => ['portfolio', 'history', range, mode],
  rules: ['rules'],
  bots: ['bots'],
  risk: ['risk'],
  activity: (q) => ['activity', q],
}

// ---------------------------------------------------------------- sorgular
export const useProviders = () => useQuery({ queryKey: qk.providers, queryFn: exchangeService.providers, staleTime: Infinity })
export const useExchanges = () => useQuery({ queryKey: qk.exchanges, queryFn: exchangeService.list })
export const useInstruments = () => useQuery({ queryKey: qk.instruments, queryFn: () => marketService.instruments(), staleTime: Infinity })
export const useOrders = (status = 'open') => useQuery({ queryKey: qk.orders(status), queryFn: () => orderService.list({ status }) })
export const usePositions = () => useQuery({ queryKey: qk.positions, queryFn: positionService.list })
export const useBalances = () => useQuery({ queryKey: qk.balances, queryFn: portfolioService.balances })
/** Gerçek ve sanal para ayrı özetlenir; mode verilmezse sunucu seçer (canlı hesap varsa gerçek) */
export const usePortfolioSummary = (mode) => useQuery({ queryKey: qk.summary(mode), queryFn: () => portfolioService.summary(mode) })
export const usePortfolioHistory = (range, mode) => useQuery({ queryKey: qk.history(range, mode), queryFn: () => portfolioService.history(range, mode), staleTime: 60_000 })
export const useRules = () => useQuery({ queryKey: qk.rules, queryFn: ruleService.list })
export const useBots = () => useQuery({ queryKey: qk.bots, queryFn: botService.list })
export const useRisk = () => useQuery({ queryKey: qk.risk, queryFn: riskService.get, refetchInterval: 5000 })
export const useActivity = (query = {}) => useQuery({ queryKey: qk.activity(query), queryFn: () => activityService.list(query) })

/** Sözlük yardımcıları: id → nesne */
export function useLookups() {
  const { data: exchanges = [] } = useExchanges()
  const { data: providers = [] } = useProviders()
  const { data: instruments = [] } = useInstruments()
  return useMemo(() => {
    const prov = Object.fromEntries(providers.map((p) => [p.id, p]))
    return {
      exchanges,
      providers,
      instruments,
      exchange: Object.fromEntries(exchanges.map((e) => [e.id, { ...e, providerInfo: prov[e.provider] }])),
      provider: prov,
      instrument: Object.fromEntries(instruments.map((i) => [i.symbol, i])),
    }
  }, [exchanges, providers, instruments])
}

// ---------------------------------------------------------------- mutasyonlar
/**
 * Ortak mutasyon: başarı/başarısızlık toast'u + ilgili sorguları yenileme.
 * success: string | (data, vars) => string
 */
export function useApiMutation(fn, { invalidate = [], success, error = true, onSuccess } = {}) {
  const qc = useQueryClient()
  const { toast } = useApp()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      const msg = typeof success === 'function' ? success(data, vars) : success
      if (msg) toast(msg)
      onSuccess?.(data, vars)
    },
    onError: (e) => error && toast(e.message || t('İşlem başarısız'), 'danger'),
  })
}

const TRADE_KEYS = [['orders'], qk.positions, qk.balances, ['portfolio'], qk.risk]

export const usePlaceOrder = (opts) => useApiMutation(orderService.place, { invalidate: TRADE_KEYS, ...opts })
export const useCancelOrder = () => useApiMutation(orderService.cancel, { invalidate: TRADE_KEYS, success: t('Emir iptal edildi') })
export const useCancelAll = () => useApiMutation(orderService.cancelAll, { invalidate: TRADE_KEYS, success: (d) => t('{0} emir iptal edildi', d.canceled) })
export const useClosePosition = () => useApiMutation(({ id, percent }) => positionService.close(id, percent), { invalidate: TRADE_KEYS, success: t('Pozisyon kapatma emri gerçekleşti') })
export const useUpdatePosition = () => useApiMutation(({ id, ...patch }) => positionService.update(id, patch), { invalidate: [qk.positions], success: t('Koruma seviyeleri güncellendi') })

export const useCreateExchange = (opts) => useApiMutation(exchangeService.create, { invalidate: [qk.exchanges, qk.balances, ['portfolio']], ...opts })
export const useUpdateExchange = (opts) => useApiMutation(({ id, ...patch }) => exchangeService.update(id, patch), { invalidate: [qk.exchanges, qk.bots], ...opts })
export const useTestExchange = () =>
  useApiMutation(exchangeService.test, { invalidate: [qk.exchanges], success: (d) => (d.ok ? t('Bağlantı başarılı ({0} ms)', d.latencyMs) : null), onSuccess: () => {} })
export const useDeleteExchange = () => useApiMutation(exchangeService.remove, { invalidate: [qk.exchanges, qk.balances, ['orders'], qk.bots, ['portfolio']], success: t('Bağlantı kaldırıldı') })

export const useSaveRule = (opts) =>
  useApiMutation(({ id, ...rule }) => (id ? ruleService.update(id, rule) : ruleService.create(rule)), { invalidate: [qk.rules], ...opts })
export const useToggleRule = () => useApiMutation(({ id, enabled }) => ruleService.update(id, { enabled }), { invalidate: [qk.rules], success: (d) => `${d.name} ${d.enabled ? 'aktif' : 'pasif'}` })
export const useDeleteRule = () => useApiMutation(ruleService.remove, { invalidate: [qk.rules], success: t('Kural silindi') })

export const useCreateBot = (opts) => useApiMutation(botService.create, { invalidate: [qk.bots], ...opts })
export const useBotAction = () =>
  useApiMutation(({ id, action }) => botService[action](id), {
    invalidate: [qk.bots, qk.risk],
    success: (d, v) => (v.action === 'remove' ? t('Bot silindi') : `${d.name}: ${{ start: t('başlatıldı'), pause: t('duraklatıldı'), stop: t('durduruldu') }[v.action]}`),
  })

export const useUpdateRisk = () => useApiMutation(riskService.update, { invalidate: [qk.risk], success: t('Risk ayarları kaydedildi') })
export const useKillSwitch = () => useApiMutation(riskService.killSwitch, { invalidate: [qk.risk, qk.bots, ...TRADE_KEYS] })
export const useUpdateMe = () => useApiMutation(authService.updateMe, { invalidate: [qk.me], success: t('Ayarlar kaydedildi') })

// ---------------------------------------------------------------- canlı senkron
/**
 * WebSocket'ten gelen "değişti" bildirimlerini React Query önbelleğine yansıtır.
 * AdminLayout içinde bir kez çağrılır.
 */
export function useRealtimeSync() {
  const qc = useQueryClient()
  const { toast } = useApp()

  useEffect(() => {
    const timers = {}
    const invalidate = (key) => {
      const id = JSON.stringify(key)
      if (timers[id]) return
      timers[id] = setTimeout(() => {
        delete timers[id]
        qc.invalidateQueries({ queryKey: key })
      }, 400)
    }
    const map = {
      orders: [['orders'], qk.balances],
      positions: [qk.positions, ['portfolio']],
      balances: [qk.balances],
      exchanges: [qk.exchanges],
      rules: [qk.rules],
      bots: [qk.bots],
      risk: [qk.risk],
    }
    const offs = Object.entries(map).map(([channel, keys]) => realtime.subscribe(channel, () => keys.forEach(invalidate)))
    offs.push(
      realtime.subscribe('activity', (entry) => {
        invalidate(['activity'])
        if (entry?.notify) toast(entry.message, entry.level === 'danger' ? 'danger' : entry.level === 'warning' ? 'warning' : entry.level === 'success' ? 'success' : 'info')
      }),
      realtime.subscribe('portfolio', (summary) => {
        if (!summary) return
        qc.setQueryData(qk.summary(summary.mode), summary)
        if (qc.getQueryData(qk.summary())?.mode === summary.mode) qc.setQueryData(qk.summary(), summary)
      }),
    )
    return () => {
      offs.forEach((off) => off())
      Object.values(timers).forEach(clearTimeout)
    }
  }, [qc, toast])
}
