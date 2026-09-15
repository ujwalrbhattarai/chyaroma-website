import * as inventoryRepository from '../repositories/inventoryRepository.js'
import * as recipeRepository from '../repositories/recipeRepository.js'
import * as supplierRepository from '../repositories/supplierRepository.js'

const inventoryError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

export function createInventoryService({ inventory = inventoryRepository, recipes = recipeRepository, suppliers = supplierRepository } = {}) {
  return {
    async listIngredients(branchId) { return inventory.listIngredients(branchId) },
    async createIngredient(branchId, payload) { return inventory.createIngredient(branchId, payload) },
    async createRecipe(branchId, payload) { return recipes.createRecipe({ branchId, itemId: payload.itemId, ingredientId: payload.ingredientId, quantityUsed: payload.quantityUsed }) },
    async listRecipes(branchId) { return recipes.listRecipes(branchId) },
    // Set/overwrite a menu item's full formula (ingredients + quantities in one save).
    // Accepts an array of { ingredientId, quantityUsed }; an empty array clears the formula.
    async replaceRecipe(branchId, itemId, lines) {
      if (!itemId) throw inventoryError('itemId is required', 400)
      if (!Array.isArray(lines)) throw inventoryError('lines must be an array', 400)
      const normalized = lines.map((l) => {
        const ingredientId = l?.ingredientId
        const quantityUsed = Number(l?.quantityUsed)
        if (!ingredientId) throw inventoryError('Each formula line needs an ingredient', 400)
        if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) throw inventoryError('quantityUsed must be a positive number', 400)
        return { ingredientId, quantityUsed }
      })
      return recipes.replaceRecipesForItem(branchId, itemId, normalized)
    },
    async listLowStock(branchId) { return inventory.listLowStockIngredients(branchId) },
    async createSupplier(branchId, payload) { return suppliers.createSupplier(branchId, payload) },
    async listSuppliers(branchId) { return suppliers.listSuppliers(branchId) },
    async listPurchases(branchId) { return inventory.listPurchases(branchId) },
    async createPurchase(branchId, payload) {
      if (payload.supplierId) {
        const supplier = await suppliers.findSupplierById(payload.supplierId, branchId)
        if (!supplier) throw inventoryError('Supplier not found', 404)
      }
      const ingredient = await inventory.findIngredientById(payload.ingredientId, branchId)
      if (!ingredient) throw inventoryError('Ingredient not found', 404)
      const quantity = Number(payload.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) throw inventoryError('quantity must be a positive number')
      const unitCost = Number(payload.unitCost ?? 0)
      if (!Number.isFinite(unitCost) || unitCost < 0) throw inventoryError('unitCost must be a non-negative number')
      return inventory.createPurchase(branchId, { ...payload, supplierId: payload.supplierId ?? null, quantity, unitCost })
    },
    async adjustIngredientStock(branchId, ingredientId, stockQuantity) {
      const ingredient = await inventory.findIngredientById(ingredientId, branchId)
      if (!ingredient) throw inventoryError('Ingredient not found', 404)
      const quantity = Number(stockQuantity)
      if (!Number.isFinite(quantity) || quantity < 0) throw inventoryError('stockQuantity must be a non-negative number')
      return inventory.updateIngredientStock(ingredientId, branchId, quantity)
    },
  }
}

const service = createInventoryService()
export const listIngredients = (...args) => service.listIngredients(...args)
export const createIngredient = (...args) => service.createIngredient(...args)
export const createRecipe = (...args) => service.createRecipe(...args)
export const replaceRecipe = (...args) => service.replaceRecipe(...args)
export const listRecipes = (...args) => service.listRecipes(...args)
export const listLowStock = (...args) => service.listLowStock(...args)
export const createSupplier = (...args) => service.createSupplier(...args)
export const listSuppliers = (...args) => service.listSuppliers(...args)
export const listPurchases = (...args) => service.listPurchases(...args)
export const createPurchase = (...args) => service.createPurchase(...args)
export const adjustIngredientStock = (...args) => service.adjustIngredientStock(...args)
