import { Router } from 'express'
import { createBranchHandler, deactivateBranchHandler, getBranches, updateBranchHandler } from '../controllers/branchController.js'
import { requireAuthentication } from '../middleware/authMiddleware.js'

const router = Router()

router.use(requireAuthentication)
router.get('/', getBranches)
router.post('/', createBranchHandler)
router.put('/:branchId', updateBranchHandler)
router.patch('/:branchId/deactivate', deactivateBranchHandler)

export default router
