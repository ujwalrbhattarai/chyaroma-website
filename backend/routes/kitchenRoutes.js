import { Router } from 'express'
import { getKitchenQueueHandler, kitchenEvents, transitionKitchenOrderHandler } from '../controllers/kitchenController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

router.use(requireAuthentication, requireRoles('super_admin', 'branch_manager', 'kitchen_staff'))
router.get('/queue', getKitchenQueueHandler)
router.patch('/orders/:orderId', transitionKitchenOrderHandler)

export { kitchenEvents }
export default router
