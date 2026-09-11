const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/branches${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Branch request failed')
  return data
}

export const listBranches = () => request('')
export const createBranch = (payload) => request('', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
export const updateBranch = (branchId, payload) => request(`/${branchId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
export const deactivateBranch = (branchId) => request(`/${branchId}/deactivate`, { method: 'PATCH' })
