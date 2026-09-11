import { Router } from 'express'
import { adjustIngredientStockHandler, createIngredientHandler, createPurchaseHandler, createRecipeHandler, createSupplierHandler, getIngredientsHandler, getLowStockHandler, getPurchasesHandler, getRecipesHandler, getSuppliersHandler } from '../controllers/inventoryController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

router.use(requireAuthentication, requireRoles('super_admin', 'branch_manager'))
router.get('/ingredients', getIngredientsHandler)
router.post('/ingredients', createIngredientHandler)
router.patch('/ingredients/:ingredientId/stock', adjustIngredientStockHandler)
router.get('/recipes', getRecipesHandler)
router.post('/recipes', createRecipeHandler)
router.get('/low-stock', getLowStockHandler)
router.get('/suppliers', getSuppliersHandler)
router.post('/suppliers', createSupplierHandler)
router.get('/purchases', getPurchasesHandler)
router.post('/purchases', createPurchaseHandler)

export default router

