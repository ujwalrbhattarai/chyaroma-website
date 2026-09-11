const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/orders${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Order request failed')
  return data
}

export const getPublicMenu = (token) => request(`/public/menu?token=${encodeURIComponent(token)}`)
export const placeOrder = (payload) => request('/public/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const getOrderStatus = (token) => request(`/public/status?token=${encodeURIComponent(token)}`)
export const cancelOrder = (payload) => request('/public/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
