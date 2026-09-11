const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/api\/?$/, '')

// Turn a stored relative image path (e.g. /uploads/menu/x.jpg) into a usable URL.
export const imageUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${apiBase}${url}`
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/menu${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Menu request failed')
  return data
}

export const getMenu = (branchId) => request(branchId ? `?branchId=${encodeURIComponent(branchId)}` : '')
export const createCategory = (payload, branchId) => request(`/categories${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const updateCategory = (categoryId, payload, branchId) => request(`/categories/${categoryId}${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const deactivateCategory = (categoryId, branchId) => request(`/categories/${categoryId}/deactivate${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { method: 'PATCH' })

// Item create/update supports an optional image file (multipart) from the device.
function itemPayloadRequest(path, method, payload, image, branchId) {
  const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''
  if (image) {
    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => { if (value !== undefined && value !== null) formData.append(key, String(value)) })
    formData.append('image', image)
    return request(`${path}${qs}`, { method, body: formData })
  }
  return request(`${path}${qs}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

export const createMenuItem = (payload, image, branchId) => itemPayloadRequest('/items', 'POST', payload, image, branchId)
export const updateMenuItem = (itemId, payload, image, branchId) => itemPayloadRequest(`/items/${itemId}`, 'PUT', payload, image, branchId)
export const toggleAvailability = (itemId, isAvailable, branchId) => request(`/items/${itemId}/availability${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAvailable }) })
