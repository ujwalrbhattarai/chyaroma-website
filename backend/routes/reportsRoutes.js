import { Router } from 'express'
import { getOverviewHandler, getReportHandler } from '../controllers/reportsController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

router.use(requireAuthentication, requireRoles('super_admin', 'branch_manager'))
router.get('/overview', getOverviewHandler)
router.get('/report', getReportHandler)

export default router
