import { http } from '../http'

export const riskService = {
  get: () => http.get('/risk'),
  update: (patch) => http.patch('/risk', patch),
  /** { active, reason?, cancelOrders?, closePositions? } */
  killSwitch: (payload) => http.post('/risk/kill-switch', payload),
}

export const activityService = {
  /** query: { source?, level?, limit? } */
  list: (query) => http.get('/activity', query),
}

export const devService = {
  /** Sadece mock modda: demo verisini sıfırlar */
  resetMock: () => http.post('/mock/reset'),
}
