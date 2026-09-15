import { adjustIngredientStock, createIngredient, createPurchase, createRecipe, createSupplier, listIngredients, listLowStock, listPurchases, listRecipes, listSuppliers, replaceRecipe } from '../services/inventoryService.js'

function resolveBranchId(request) {
  return request.query.branchId ?? request.body.branchId ?? request.user.branchId
}

export async function getIngredientsHandler(request, response, next) { try { response.status(200).json({ ingredients: await listIngredients(resolveBranchId(request)) }) } catch (error) { next(error) } }
export async function createIngredientHandler(request, response, next) { try { response.status(201).json({ ingredient: await createIngredient(resolveBranchId(request), request.body) }) } catch (error) { next(error) } }
export async function adjustIngredientStockHandler(request, response, next) { try { response.status(200).json({ ingredient: await adjustIngredientStock(resolveBranchId(request), request.params.ingredientId, request.body.stockQuantity) }) } catch (error) { next(error) } }
export async function getRecipesHandler(request, response, next) { try { response.status(200).json({ recipes: await listRecipes(resolveBranchId(request)) }) } catch (error) { next(error) } }
export async function createRecipeHandler(request, response, next) { try { response.status(201).json({ recipe: await createRecipe(resolveBranchId(request), request.body) }) } catch (error) { next(error) } }
export async function replaceRecipeHandler(request, response, next) { try { response.status(200).json({ recipes: await replaceRecipe(resolveBranchId(request), request.params.itemId, request.body.lines) }) } catch (error) { next(error) } }
export async function getLowStockHandler(request, response, next) { try { response.status(200).json({ ingredients: await listLowStock(resolveBranchId(request)) }) } catch (error) { next(error) } }
export async function getSuppliersHandler(request, response, next) { try { response.status(200).json({ suppliers: await listSuppliers(resolveBranchId(request)) }) } catch (error) { next(error) } }
export async function createSupplierHandler(request, response, next) { try { response.status(201).json({ supplier: await createSupplier(resolveBranchId(request), request.body) }) } catch (error) { next(error) } }
export async function getPurchasesHandler(request, response, next) { try { response.status(200).json({ purchases: await listPurchases(resolveBranchId(request)) }) } catch (error) { next(error) } }
export async function createPurchaseHandler(request, response, next) { try { response.status(201).json({ purchase: await createPurchase(resolveBranchId(request), request.body) }) } catch (error) { next(error) } }
