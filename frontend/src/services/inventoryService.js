const apiUrl = import.meta.env.VITE_API_URL ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/inventory${path}`, { credentials: 'include', ...options })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Inventory request failed')
  return data
}

const qs = (branchId) => (branchId ? `?branchId=${encodeURIComponent(branchId)}` : '')

const json = (payload) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

export const getIngredients = (branchId) => request(`/ingredients${qs(branchId)}`)
export const createIngredient = (payload, branchId) => request(`/ingredients${qs(branchId)}`, json(payload))
export const adjustIngredientStock = (ingredientId, stockQuantity, branchId) =>
  request(`/ingredients/${ingredientId}/stock${qs(branchId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockQuantity }) })
export const getRecipes = (branchId) => request(`/recipes${qs(branchId)}`)
export const createRecipe = (payload, branchId) => request(`/recipes${qs(branchId)}`, json(payload))
export const getLowStock = (branchId) => request(`/low-stock${qs(branchId)}`)
export const getSuppliers = (branchId) => request(`/suppliers${qs(branchId)}`)
export const createSupplier = (payload, branchId) => request(`/suppliers${qs(branchId)}`, json(payload))
export const getPurchases = (branchId) => request(`/purchases${qs(branchId)}`)
export const createPurchase = (payload, branchId) => request(`/purchases${qs(branchId)}`, json(payload))
