import * as menuRepository from '../repositories/menuRepository.js'

const menuError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

export function assertMenuAccess(user) { if (!user || !['super_admin', 'branch_manager'].includes(user.role)) throw menuError('Forbidden', 403) }
function resolveBranchId(user, requestedBranchId) { return user.role === 'super_admin' ? requestedBranchId : user.branchId }
function normalizeName(name) { return name?.trim() }

function normalizeCategory(payload = {}) { const name = normalizeName(payload.name); const sortOrder = Number(payload.sortOrder ?? 0); if (!name) throw menuError('Category name is required'); if (!Number.isInteger(sortOrder) || sortOrder < 0) throw menuError('sortOrder must be a non-negative integer'); return { name, sortOrder } }
// isAvailable arrives as a boolean for JSON, or a "true"/"false" string in multipart forms.
function parseAvailable(value) {
  if (value === undefined || value === null) return true
  return value === true || value === 'true' || value === '1'
}
function normalizeItem(payload = {}) { const categoryId = payload.categoryId; const name = normalizeName(payload.name); const price = Number(payload.price); const description = payload.description?.trim() ?? ''; const imageUrl = payload.imageUrl?.trim() ?? ''; const prepTimeMinutes = Number(payload.prepTimeMinutes ?? 0); const isAvailable = parseAvailable(payload.isAvailable); if (!categoryId || !name) throw menuError('Category and item name are required'); if (!Number.isFinite(price) || price < 0) throw menuError('price must be a non-negative number'); if (!Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 0) throw menuError('prepTimeMinutes must be a non-negative integer'); return { categoryId, name, price, description, imageUrl, prepTimeMinutes, isAvailable } }

export function createMenuService({ repository = menuRepository } = {}) {
  return {
    async listMenu(user, requestedBranchId) {
      assertMenuAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw menuError('branchId is required', 400)
      return { categories: await repository.listCategories(branchId), items: await repository.listMenuItems(branchId) }
    },
    async createCategory(user, requestedBranchId, payload) { assertMenuAccess(user); const branchId = resolveBranchId(user, requestedBranchId); if (!branchId) throw menuError('branchId is required', 400); return repository.createCategory(branchId, normalizeCategory(payload)) },
    async updateCategory(user, requestedBranchId, categoryId, payload) { assertMenuAccess(user); const branchId = resolveBranchId(user, requestedBranchId); if (!branchId) throw menuError('branchId is required', 400); const existing = await repository.findCategoryById(categoryId, branchId); if (!existing) throw menuError('Category not found', 404); return repository.updateCategory(categoryId, branchId, { ...normalizeCategory({ ...existing, ...payload }), isActive: payload.isActive ?? existing.isActive }) },
    async deactivateCategory(user, requestedBranchId, categoryId) { assertMenuAccess(user); const branchId = resolveBranchId(user, requestedBranchId); if (!branchId) throw menuError('branchId is required', 400); const existing = await repository.findCategoryById(categoryId, branchId); if (!existing) throw menuError('Category not found', 404); return repository.deactivateCategory(categoryId, branchId) },
    async createMenuItem(user, requestedBranchId, payload) { assertMenuAccess(user); const branchId = resolveBranchId(user, requestedBranchId); if (!branchId) throw menuError('branchId is required', 400); const normalized = normalizeItem(payload); const category = await repository.findCategoryById(normalized.categoryId, branchId); if (!category) throw menuError('Category not found', 404); return repository.createMenuItem(branchId, normalized) },
    async updateMenuItem(user, requestedBranchId, itemId, payload) { assertMenuAccess(user); const branchId = resolveBranchId(user, requestedBranchId); if (!branchId) throw menuError('branchId is required', 400); const existing = await repository.findMenuItemById(itemId, branchId); if (!existing) throw menuError('Menu item not found', 404); const normalized = normalizeItem({ ...existing, ...payload }); return repository.updateMenuItem(itemId, branchId, normalized) },
    async toggleAvailability(user, requestedBranchId, itemId, isAvailable) { assertMenuAccess(user); const branchId = resolveBranchId(user, requestedBranchId); if (!branchId) throw menuError('branchId is required', 400); const existing = await repository.findMenuItemById(itemId, branchId); if (!existing) throw menuError('Menu item not found', 404); return repository.toggleMenuItemAvailability(itemId, branchId, Boolean(isAvailable)) },
  }
}

const service = createMenuService()
export const listMenu = (...args) => service.listMenu(...args)
export const createCategory = (...args) => service.createCategory(...args)
export const updateCategory = (...args) => service.updateCategory(...args)
export const deactivateCategory = (...args) => service.deactivateCategory(...args)
export const createMenuItem = (...args) => service.createMenuItem(...args)
export const updateMenuItem = (...args) => service.updateMenuItem(...args)
export const toggleAvailability = (...args) => service.toggleAvailability(...args)
