import { Router } from 'express'
import { createStaffHandler, deactivateStaffHandler, getStaff } from '../controllers/staffController.js'
import { requireAuthentication } from '../middleware/authMiddleware.js'

const router = Router()

router.use(requireAuthentication)
router.get('/', getStaff)
router.post('/', createStaffHandler)
router.patch('/:staffId/deactivate', deactivateStaffHandler)

export default router
