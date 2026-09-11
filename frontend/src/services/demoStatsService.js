const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/demo${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data?.error ?? 'Demo stats request failed')
  return data
}

/** Fetch admin-only demo statistics. Requires super_admin session. */
export const getDemoStats = () => request('/admin/stats')
