import { Router } from 'express'
import { approveTransferHandler, denyTransferHandler, listPendingTransfersHandler } from '../controllers/transferController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

// Staff-only: cashiers and managers approve/deny customer table-move requests.
router.use(requireAuthentication)
router.get('/', requireRoles('super_admin', 'branch_manager', 'cashier'), listPendingTransfersHandler)
router.post('/:id/approve', requireRoles('super_admin', 'branch_manager', 'cashier'), approveTransferHandler)
router.post('/:id/deny', requireRoles('super_admin', 'branch_manager', 'cashier'), denyTransferHandler)

export default router