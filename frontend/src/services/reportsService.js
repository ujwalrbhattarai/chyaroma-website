const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/reports${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Reports request failed')
  return data
}

export const getOverview = (branchId) =>
  request(`/overview${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`)

export const getReport = ({ branchId, from, to } = {}) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branchId', branchId)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return request(`/report${qs ? `?${qs}` : ''}`)
}
