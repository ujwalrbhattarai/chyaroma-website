const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/admin/super-admins${path}`, {
    credentials: 'include',
    ...options,
  })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data?.error ?? 'Super Admin request failed')
  return data
}

export const listSuperAdmins = () => request('')

export const createSuperAdmin = (payload) =>
  request('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const deactivateSuperAdmin = (id) =>
  request(`/${id}/deactivate`, { method: 'PATCH' })
