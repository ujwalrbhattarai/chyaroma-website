import { getDeviceId } from './deviceId'

const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const deviceId = getDeviceId()
  if (deviceId) headers.set('X-Device-Id', deviceId)
  const response = await fetch(`${apiUrl}/billing${path}`, { credentials: 'include', ...options, headers })
  const text = response.status === 204 ? '' : await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!response.ok) throw new Error(data?.error ?? `Request failed with ${response.status}`)
  return data
}

export const requestBill = (token) => request('/public/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
export const checkoutBillRequest = ({ token, billId, method = 'cash' }) => request('/public/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, billId, method }) })
export const listBranchBills = () => request('/branch')
export const getTableBill = (tableNumber) => request(`/table/${encodeURIComponent(tableNumber)}`)
export const completeCashPayment = (billId) => request(`/${billId}/pay-cash`, { method: 'POST' })
export const approveCheckout = (billId, method = 'cash') => request(`/${billId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method }) })
export const generateBill = (tableId) => request('/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId }) })
export const finalizeBill = (billId) => request(`/${billId}/finalize`, { method: 'PATCH' })
export const updateBill = (billId, payload) => request(`/${billId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const recordPayment = (billId, payload) => request(`/${billId}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const addAdjustment = (billId, payload) => request(`/${billId}/adjustments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
