import { getDeviceId } from './deviceId'

const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const deviceId = getDeviceId()
  if (deviceId) headers.set('X-Device-Id', deviceId)
  const response = await fetch(`${apiUrl}/transfers${path}`, { credentials: 'include', ...options, headers })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data?.error ?? 'Transfer request failed')
  return data
}

export const listPendingTransfers = () => request('/')
export const approveTransfer = (id) => request(`/${id}/approve`, { method: 'POST' })
export const denyTransfer = (id) => request(`/${id}/deny`, { method: 'POST' })