import { Router } from 'express'
import { createSuperAdminHandler, deactivateSuperAdminHandler, getSuperAdmins } from '../controllers/superAdminController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

// Both authentication AND super_admin role are required for every route in this file.
// Branch managers, kitchen staff, waiters, cashiers, and any other role receive 403.
router.use(requireAuthentication)
router.use(requireRoles('super_admin'))

router.get('/', getSuperAdmins)
router.post('/', createSuperAdminHandler)
router.patch('/:id/deactivate', deactivateSuperAdminHandler)

export default router
