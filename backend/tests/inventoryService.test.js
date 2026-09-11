import assert from 'node:assert/strict'
import test from 'node:test'
import { createInventoryService } from '../services/inventoryService.js'

const BRANCH = 'branch-1'
const sampleIngredient = { id: 'ing-1', branchId: BRANCH, name: 'Milk', unit: 'L', stockQuantity: 10, lowStockThreshold: 2 }
const sampleSupplier   = { id: 'sup-1', branchId: BRANCH, name: 'Fresh Farms' }

const makeService = ({ ingredients = [sampleIngredient], suppliers = [sampleSupplier], recipes = [] } = {}) => {
  const ingStore  = [...ingredients]
  const supStore  = [...suppliers]
  const recStore  = [...recipes]
  return createInventoryService({
    inventory: {
      listIngredients:       async (branchId) => ingStore.filter((i) => i.branchId === branchId),
      findIngredientById:    async (id, branchId) => ingStore.find((i) => i.id === id && i.branchId === branchId) ?? null,
      createIngredient:      async (branchId, payload) => { const i = { ...payload, id: `ing-new`, branchId }; ingStore.push(i); return i },
      listLowStockIngredients: async (branchId) => ingStore.filter((i) => i.branchId === branchId && i.stockQuantity <= i.lowStockThreshold),
      createPurchase:        async (branchId, payload) => ({ ...payload, id: 'pur-1', branchId }),
    },
    recipes: {
      listRecipes:   async (branchId) => recStore.filter((r) => r.branchId === branchId),
      createRecipe:  async (payload) => { const r = { ...payload, id: 'rec-1' }; recStore.push(r); return r },
    },
    suppliers: {
      listSuppliers:       async (branchId) => supStore.filter((s) => s.branchId === branchId),
      findSupplierById:    async (id, branchId) => supStore.find((s) => s.id === id && s.branchId === branchId) ?? null,
      createSupplier:      async (branchId, payload) => ({ ...payload, id: 'sup-new', branchId }),
    },
  })
}

test('listIngredients returns branch ingredients', async () => {
  const service = makeService()
  const result = await service.listIngredients(BRANCH)
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'Milk')
})

test('createIngredient adds ingredient to branch', async () => {
  const service = makeService()
  const ingredient = await service.createIngredient(BRANCH, { name: 'Sugar', unit: 'kg', stockQuantity: 5, lowStockThreshold: 1 })
  assert.equal(ingredient.name, 'Sugar')
  assert.equal(ingredient.branchId, BRANCH)
})

test('listLowStock returns only ingredients at or below threshold', async () => {
  const lowStock = { id: 'ing-2', branchId: BRANCH, name: 'Cream', unit: 'L', stockQuantity: 1, lowStockThreshold: 2 }
  const service = makeService({ ingredients: [sampleIngredient, lowStock] })
  const result = await service.listLowStock(BRANCH)
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'Cream')
})

test('createPurchase validates supplier exists', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.createPurchase(BRANCH, { supplierId: 'ghost-sup', ingredientId: 'ing-1', quantity: 5, unitCost: 100 }),
    /Supplier not found/i,
  )
})

test('createPurchase validates ingredient exists', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.createPurchase(BRANCH, { supplierId: 'sup-1', ingredientId: 'ghost-ing', quantity: 5, unitCost: 100 }),
    /Ingredient not found/i,
  )
})

test('createPurchase succeeds with valid supplier and ingredient', async () => {
  const service = makeService()
  const purchase = await service.createPurchase(BRANCH, { supplierId: 'sup-1', ingredientId: 'ing-1', quantity: 5, unitCost: 200 })
  assert.ok(purchase.id)
})

test('listSuppliers returns branch suppliers', async () => {
  const service = makeService()
  const result = await service.listSuppliers(BRANCH)
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'Fresh Farms')
})
