import { Router } from 'express'
import { createCategoryHandler, createMenuItemHandler, deactivateCategoryHandler, getMenu, toggleAvailabilityHandler, updateCategoryHandler, updateMenuItemHandler } from '../controllers/menuController.js'
import { requireAuthentication } from '../middleware/authMiddleware.js'
import { uploadMenuImage } from '../middleware/uploadMiddleware.js'

const router = Router()

router.use(requireAuthentication)
router.get('/', getMenu)
router.post('/categories', createCategoryHandler)
router.put('/categories/:categoryId', updateCategoryHandler)
router.patch('/categories/:categoryId/deactivate', deactivateCategoryHandler)
router.post('/items', uploadMenuImage.single('image'), createMenuItemHandler)
router.put('/items/:itemId', uploadMenuImage.single('image'), updateMenuItemHandler)
router.patch('/items/:itemId/availability', toggleAvailabilityHandler)

export default router
