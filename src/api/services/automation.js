import { http } from '../http'

export const ruleService = {
  list: () => http.get('/rules'),
  create: (rule) => http.post('/rules', rule),
  update: (id, patch) => http.patch(`/rules/${id}`, patch),
  remove: (id) => http.del(`/rules/${id}`),
}

export const botService = {
  list: () => http.get('/bots'),
  create: (bot) => http.post('/bots', bot),
  start: (id) => http.post(`/bots/${id}/start`),
  pause: (id) => http.post(`/bots/${id}/pause`),
  stop: (id) => http.post(`/bots/${id}/stop`),
  remove: (id) => http.del(`/bots/${id}`),
}
