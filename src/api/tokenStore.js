// Oturum token'ı (localStorage). Gerekirse httpOnly cookie'ye geçilebilir.
const KEY = 'tn-token'

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(KEY, token)
      else localStorage.removeItem(KEY)
    } catch {
      /* yoksay */
    }
  },
}
