import { Router } from 'express'
import { authErrorHandler, currentUser, login, logout, refresh } from '../controllers/authController.js'
import { requireAuthentication } from '../middleware/authMiddleware.js'
const router = Router()
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', requireAuthentication, logout)
router.get('/me', requireAuthentication, currentUser)
router.use(authErrorHandler)
export default router
