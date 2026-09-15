import { Router } from 'express'
import { cancelOrderHandler, getOrderStatusHandler, getPublicMenuHandler, getStaffMenuHandler, getStaffReadyOrdersHandler, placeOrderHandler, placeStaffOrderHandler, serveStaffOrderHandler } from '../controllers/orderController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/public/menu', getPublicMenuHandler)
router.post('/public/orders', placeOrderHandler)
router.get('/public/status', getOrderStatusHandler)
router.post('/public/cancel', cancelOrderHandler)

// Waiter / staff ordering (authenticated, branch-staff roles):
// place an order for any table, view the staff menu, list ready-to-serve orders, mark served.
const STAFF_ROLES = ['super_admin', 'branch_manager', 'cashier', 'kitchen_staff', 'waiter']
router.use(requireAuthentication)
router.get('/staff/menu', requireRoles(...STAFF_ROLES), getStaffMenuHandler)
router.get('/staff/ready', requireRoles(...STAFF_ROLES), getStaffReadyOrdersHandler)
router.post('/staff/orders', requireRoles(...STAFF_ROLES), placeStaffOrderHandler)
router.post('/staff/orders/:orderId/serve', requireRoles(...STAFF_ROLES), serveStaffOrderHandler)

export default router
