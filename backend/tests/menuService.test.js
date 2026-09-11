import assert from 'node:assert/strict'
import test from 'node:test'
import { createMenuService } from '../services/menuService.js'

const managerUser = { id: 'manager-1', role: 'branch_manager', branchId: 'branch-1' }
const adminUser = { id: 'admin-1', role: 'super_admin', branchId: null }
const kitchenUser = { id: 'kitchen-1', role: 'kitchen_staff', branchId: 'branch-1' }

const sampleCategory = { id: 'cat-1', branchId: 'branch-1', name: 'Drinks', sortOrder: 0, isActive: true }
const sampleItem = { id: 'item-1', branchId: 'branch-1', categoryId: 'cat-1', name: 'Coffee', price: 150, description: 'Hot coffee', prepTimeMinutes: 3, isAvailable: true }

const makeService = (categories = [sampleCategory], menuItems = [sampleItem]) => {
  const cats = [...categories]
  const items = [...menuItems]
  return createMenuService({
    repository: {
      listCategories: async (branchId) => cats.filter((c) => c.branchId === branchId),
      listMenuItems: async (branchId) => items.filter((i) => i.branchId === branchId),
      findCategoryById: async (id, branchId) => cats.find((c) => c.id === id && c.branchId === branchId) ?? null,
      findMenuItemById: async (id, branchId) => items.find((i) => i.id === id && i.branchId === branchId) ?? null,
      createCategory: async (branchId, payload) => { const c = { ...payload, id: `cat-new`, branchId, isActive: true }; cats.push(c); return c },
      updateCategory: async (id, branchId, payload) => { const idx = cats.findIndex((c) => c.id === id); cats[idx] = { ...cats[idx], ...payload }; return cats[idx] },
      deactivateCategory: async (id, branchId) => { const c = cats.find((c) => c.id === id); c.isActive = false; return c },
      createMenuItem: async (branchId, payload) => { const i = { ...payload, id: `item-new`, branchId }; items.push(i); return i },
      updateMenuItem: async (id, branchId, payload) => { const idx = items.findIndex((i) => i.id === id); items[idx] = { ...items[idx], ...payload }; return items[idx] },
      toggleMenuItemAvailability: async (id, branchId, isAvailable) => { const i = items.find((i) => i.id === id); i.isAvailable = isAvailable; return i },
    },
  })
}

test('Kitchen staff cannot access menu management', async () => {
  const service = makeService()
  await assert.rejects(async () => service.listMenu(kitchenUser, 'branch-1'), /Forbidden/)
})

test('Manager can list their branch menu', async () => {
  const service = makeService()
  const result = await service.listMenu(managerUser, null)
  assert.equal(result.categories.length, 1)
  assert.equal(result.items.length, 1)
})

test('Manager cannot list another branch menu', async () => {
  const service = makeService()
  // branchId is ignored for manager — service uses their own branchId
  const result = await service.listMenu(managerUser, 'branch-999')
  assert.equal(result.categories[0].branchId, 'branch-1')
})

test('Super Admin can list menu for any branch', async () => {
  const service = makeService()
  const result = await service.listMenu(adminUser, 'branch-1')
  assert.equal(result.categories.length, 1)
})

test('Super Admin without branchId param gets error', async () => {
  const service = makeService()
  await assert.rejects(async () => service.listMenu(adminUser, null), /branchId is required/)
})

test('Manager can create a category', async () => {
  const service = makeService([], [])
  const cat = await service.createCategory(managerUser, null, { name: 'Hot drinks', sortOrder: 1 })
  assert.equal(cat.name, 'Hot drinks')
  assert.equal(cat.branchId, 'branch-1')
})

test('createCategory rejects empty name', async () => {
  const service = makeService([], [])
  await assert.rejects(async () => service.createCategory(managerUser, null, { name: '' }), /required/)
})

test('Manager can create a menu item', async () => {
  const service = makeService()
  const item = await service.createMenuItem(managerUser, null, { name: 'Latte', price: 200, categoryId: 'cat-1', prepTimeMinutes: 5 })
  assert.equal(item.name, 'Latte')
  assert.equal(item.price, 200)
})

test('createMenuItem rejects negative price', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.createMenuItem(managerUser, null, { name: 'X', price: -10, categoryId: 'cat-1' }),
    /price/,
  )
})

test('Manager can toggle item availability', async () => {
  const service = makeService()
  const item = await service.toggleAvailability(managerUser, null, 'item-1', false)
  assert.equal(item.isAvailable, false)
})

test('toggleAvailability throws 404 for unknown item', async () => {
  const service = makeService()
  await assert.rejects(async () => service.toggleAvailability(managerUser, null, 'ghost-item', true), /not found/i)
})
