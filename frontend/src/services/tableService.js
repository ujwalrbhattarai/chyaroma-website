const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/tables${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    const error = new Error(data.error ?? 'Table request failed')
    error.statusCode = response.status
    throw error
  }
  return data
}

export const listTables = (branchId) => request(branchId ? `?branchId=${encodeURIComponent(branchId)}` : '')
export const createTable = (payload, branchId) =>
  request(branchId ? `?branchId=${encodeURIComponent(branchId)}` : '', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
export const getTableQr = (tableId, branchId) =>
  request(`/${encodeURIComponent(tableId)}/qr${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`)
export const deactivateTable = (tableId, branchId) =>
  request(`/${tableId}/deactivate${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { method: 'PATCH' })
export const setTableOccupied = (tableId, occupied, branchId) =>
  request(`/${tableId}/occupied${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ occupied }) })
export const forceReleaseTable = (tableId, branchId) =>
  request(`/${tableId}/force-release${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { method: 'POST' })
export const releaseTable = (token) => request('/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })