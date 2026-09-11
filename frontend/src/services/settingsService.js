const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/settings${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Settings request failed')
  return data
}

export const getSettings = () => request('')
export const updateSettings = (payload) => request('', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const getPublicBranding = (tableToken) => request(`/public/branding${tableToken ? `?token=${encodeURIComponent(tableToken)}` : ''}`)
export const uploadLogo = (dataUrl) => request('/logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl }) })
