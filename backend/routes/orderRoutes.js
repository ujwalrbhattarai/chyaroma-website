import { Router } from 'express'
import { cancelOrderHandler, getOrderStatusHandler, getPublicMenuHandler, placeOrderHandler } from '../controllers/orderController.js'

const router = Router()

router.get('/public/menu', getPublicMenuHandler)
router.post('/public/orders', placeOrderHandler)
router.get('/public/status', getOrderStatusHandler)
router.post('/public/cancel', cancelOrderHandler)

export default router
