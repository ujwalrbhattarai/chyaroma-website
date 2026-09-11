const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/staff${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Staff request failed')
  return data
}

export const listStaff = () => request('')
export const createStaff = (payload) =>
  request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const deactivateStaff = (staffId) => request(`/${staffId}/deactivate`, { method: 'PATCH' })
