import { Router } from 'express'
import { createTableHandler, deactivateTableHandler, forceReleaseTableHandler, getTablesHandler, getTableQrHandler, releaseTableHandler, setTableOccupiedHandler, validateTableTokenHandler } from '../controllers/tableController.js'
import { requireAuthentication } from '../middleware/authMiddleware.js'

const router = Router()

// Public: validate a QR token on scan (no auth needed — customer facing)
router.post('/validate', validateTableTokenHandler)
router.post('/release', releaseTableHandler)

// Staff: table management (requires login)
router.use(requireAuthentication)
router.get('/', getTablesHandler)
router.post('/', createTableHandler)
router.get('/:tableId/qr', getTableQrHandler)
router.patch('/:tableId/occupied', setTableOccupiedHandler)
router.post('/:tableId/force-release', forceReleaseTableHandler)
router.patch('/:tableId/deactivate', deactivateTableHandler)

export default router
