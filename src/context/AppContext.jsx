import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { tokenStore } from '../api/tokenStore'
import { setUnauthorizedHandler } from '../api/http'
import { authService } from '../api/services/auth'

const AppContext = createContext(null)

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* depolama yoksa sessizce geç */
  }
}

const DEFAULT_WATCHLIST = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'THYAO', 'ASELS', 'EUR/USD', 'XAU/USD']

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => read('tn-theme', 'dark'))
  const [sidebarMini, setSidebarMini] = useState(() => read('tn-sidebar-mini', false))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(() => (tokenStore.get() ? read('tn-user', null) : null))
  const [toasts, setToasts] = useState([])
  const [watchlist, setWatchlist] = useState(() => read('tn-watchlist', DEFAULT_WATCHLIST))
  const [confirmState, setConfirmState] = useState(null)
  const confirmResolver = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme)
    write('tn-theme', theme)
  }, [theme])
  useEffect(() => write('tn-sidebar-mini', sidebarMini), [sidebarMini])
  useEffect(() => write('tn-watchlist', watchlist), [watchlist])

  const login = useCallback((u, token) => {
    if (token) tokenStore.set(token)
    setUser(u)
    write('tn-user', u)
  }, [])

  const logout = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    try {
      localStorage.removeItem('tn-user')
    } catch {
      /* yoksay */
    }
  }, [])

  // Not: süslü parantez şart – aksi halde dönen fonksiyon React'te "cleanup" sayılıp logout'u çağırır
  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  /** Sunucudan güncel profil (plan, rol, izinler) – açılışta ve ihtiyaç halinde */
  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) return null
    try {
      const u = await authService.me()
      setUser(u)
      write('tn-user', u)
      return u
    } catch {
      return null
    }
  }, [])
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  /** Sunucudaki oturumu da kapatır */
  const signOut = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      /* oturum zaten geçersiz olabilir */
    }
    logout()
  }, [logout])

  const toast = useCallback((message, variant = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-4), { id, message, variant }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), variant === 'danger' ? 6000 : 4000)
  }, [])
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia('(max-width: 1199.98px)').matches) setSidebarOpen((o) => !o)
    else setSidebarMini((m) => !m)
  }, [])

  const toggleWatch = useCallback((symbol) => {
    setWatchlist((w) => (w.includes(symbol) ? w.filter((s) => s !== symbol) : [...w, symbol]))
  }, [])

  /**
   * Onay penceresi: const ok = await confirm({ title, message, confirmText, variant: 'danger' })
   */
  const confirm = useCallback((opts) => {
    setConfirmState({ confirmText: 'Onayla', cancelText: 'Vazgeç', variant: 'primary', ...opts })
    return new Promise((resolve) => (confirmResolver.current = resolve))
  }, [])
  const resolveConfirm = useCallback((value) => {
    confirmResolver.current?.(value)
    confirmResolver.current = null
    setConfirmState(null)
  }, [])

  const value = useMemo(
    () => ({
      theme, setTheme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      sidebarMini, sidebarOpen, setSidebarOpen, toggleSidebar,
      user, login, logout, signOut, refreshUser,
      toasts, toast, dismissToast,
      watchlist, toggleWatch,
      confirm, confirmState, resolveConfirm,
    }),
    [theme, sidebarMini, sidebarOpen, toggleSidebar, user, login, logout, signOut, refreshUser, toasts, toast, dismissToast, watchlist, toggleWatch, confirm, confirmState, resolveConfirm],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext)
