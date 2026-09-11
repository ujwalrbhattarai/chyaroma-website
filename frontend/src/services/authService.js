const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/auth${path}`, { credentials: 'include', ...options })
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) {
    if (!response.ok) {
      const error = new Error(`Authentication failed (${response.status})`)
      error.status = response.status
      throw error
    }
    return null
  }

  const data = JSON.parse(text)
  if (!response.ok) {
    const error = new Error(data.error ?? 'Authentication failed')
    error.status = response.status
    throw error
  }
  return data
}
export const login = (credentials) => request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })
// An access token is intentionally short-lived (15 minutes). On app load, use
// the longer-lived, HTTP-only refresh cookie to restore the session instead of
// logging a staff member out after a browser refresh.
export async function getSession() {
  try {
    return await request('/me')
  } catch (error) {
    if (error.status !== 401) throw error
    await request('/refresh', { method: 'POST' })
    return request('/me')
  }
}
export const logout = () => request('/logout', { method: 'POST' })
