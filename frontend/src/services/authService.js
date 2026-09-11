const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
async function request(path, options = {}) { const response = await fetch(`${apiUrl}/auth${path}`, { credentials: 'include', ...options }); if (response.status === 204) return null; const text = await response.text(); if (!text) { if (!response.ok) throw new Error(`Authentication failed (${response.status})`); return null; } const data = JSON.parse(text); if (!response.ok) throw new Error(data.error ?? 'Authentication failed'); return data }
export const login = (credentials) => request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })
export const getSession = () => request('/me')
export const logout = () => request('/logout', { method: 'POST' })
