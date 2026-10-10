// =====================================================================
//  HTTP İSTEMCİSİ
//  Tüm servisler bunu kullanır. Mock modda istek mock/server.js'e gider,
//  aksi halde fetch ile gerçek backend'e.
// =====================================================================
import { config } from './config'
import { tokenStore } from './tokenStore'
import { t, lang, tServer } from '../i18n'

export class ApiError extends Error {
  constructor(message, { status = 0, code, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let mockModule = null
const loadMock = async () => (mockModule ??= await import('../mock/server.js'))

// 401 olunca çağrılacak (AppContext oturumu kapatır)
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn)

const buildQuery = (query) => {
  const q = Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  return q.length ? `?${new URLSearchParams(q).toString()}` : ''
}

export async function request(method, path, { query, body, signal } = {}) {
  if (config.useMock) {
    try {
      const { mockRequest } = await loadMock()
      return await mockRequest(method, path, { query: Object.fromEntries(Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')), body, token: tokenStore.get() })
    } catch (e) {
      throw new ApiError(e.message || t('Mock hata'), { status: e.status || 500, code: e.code })
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  signal?.addEventListener('abort', () => controller.abort())
  const token = tokenStore.get()

  let res
  try {
    res = await fetch(`${config.apiUrl}${path}${buildQuery(query)}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Accept-Language': lang,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? t('İstek zaman aşımına uğradı') : t('Sunucuya ulaşılamıyor'), { status: 0 })
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    if (res.status === 401) onUnauthorized()
    // Backend hata gövdesi: { message, code, details } bekleniyor (bkz. docs/API.md)
    throw new ApiError(tServer(data?.message) || data?.error || t('İstek başarısız ({0})', res.status), { status: res.status, code: data?.code, details: data?.details })
  }
  // Backend { data: ... } zarfı kullanıyorsa aç
  return data && typeof data === 'object' && 'data' in data && Object.keys(data).length <= 3 ? data.data : data
}

export const http = {
  get: (path, query, opts) => request('GET', path, { ...opts, query }),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
}
