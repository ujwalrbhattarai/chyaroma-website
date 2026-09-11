const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/demo${path}`, { credentials: 'include', ...options })
  const text = response.status === 204 ? '' : await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!response.ok) throw new Error(data?.error ?? `Demo request failed (${response.status})`)
  return data
}

const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export function getSessionId() {
  const param = new URLSearchParams(window.location.search).get('sessionId')
  if (param) {
    localStorage.setItem('cc_demo_session_id', param)
    return param
  }
  return localStorage.getItem('cc_demo_session_id') ?? ''
}

export function clearSessionId() {
  localStorage.removeItem('cc_demo_session_id')
}

export const createDemoSession    = ()                       => request('/session', json({}))
export const getDemoSession       = (id)                     => request(`/session/${id}`)
export const endDemoSession       = (id)                     => request(`/session/${id}/end`, json({}))
export const getDemoMenu          = (sessionId)              => request(`/menu?sessionId=${encodeURIComponent(sessionId)}`)
export const placeDemoOrder       = (payload)                => request('/orders', json(payload))
export const getDemoOrderStatus   = (sessionId)              => request(`/orders?sessionId=${encodeURIComponent(sessionId)}`)

export const cancelDemoOrder = (sessionIdOrObj, orderId) => {
  const sessionId = typeof sessionIdOrObj === 'object' ? sessionIdOrObj.sessionId : sessionIdOrObj
  const oId = typeof sessionIdOrObj === 'object' ? sessionIdOrObj.orderId : orderId
  return request(`/orders/${oId}/cancel`, json({ sessionId, orderId: oId }))
}

export const requestDemoBill = (sessionIdOrObj) => {
  const sessionId = typeof sessionIdOrObj === 'object' ? sessionIdOrObj.sessionId : sessionIdOrObj
  return request('/bill', json({ sessionId }))
}

export const checkoutDemo = (sessionIdOrObj, billId) => {
  const sessionId = typeof sessionIdOrObj === 'object' ? sessionIdOrObj.sessionId : sessionIdOrObj
  const bId = typeof sessionIdOrObj === 'object' ? sessionIdOrObj.billId : billId
  return request('/checkout', json({ sessionId, billId: bId }))
}
