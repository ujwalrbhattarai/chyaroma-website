import { Router } from 'express'
import {
  createSessionHandler,
  getSessionHandler,
  getDemoMenuHandler,
  placeDemoOrderHandler,
  getDemoOrderStatusHandler,
  cancelDemoOrderHandler,
  requestDemoBillHandler,
  checkoutDemoHandler,
  endDemoSessionHandler,
} from '../controllers/demoController.js'
import { getDemoStatsHandler } from '../controllers/demoStatsController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

// Session lifecycle
router.post('/session',           createSessionHandler)
router.get('/session/:id',        getSessionHandler)
router.post('/session/:id/end',   endDemoSessionHandler)

// Menu
router.get('/menu',               getDemoMenuHandler)

// Orders
router.post('/orders',            placeDemoOrderHandler)
router.get('/orders',             getDemoOrderStatusHandler)
router.post('/orders/:id/cancel', cancelDemoOrderHandler)

// Billing
router.post('/bill',              requestDemoBillHandler)
router.post('/checkout',          checkoutDemoHandler)

// Admin-only: Demo statistics portal (super_admin only)
router.get('/admin/stats', requireAuthentication, requireRoles('super_admin'), getDemoStatsHandler)

export default router
