import { Router } from 'express'
import { getSettingsHandler, getPublicBrandingHandler, updateSettingsHandler, uploadLogoHandler } from '../controllers/settingsController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

// Public: branding info (cafe name + logo) for customer-facing pages — no auth needed.
router.get('/public/branding', getPublicBrandingHandler)

router.use(requireAuthentication, requireRoles('branch_manager', 'super_admin'))
router.get('/', getSettingsHandler)
router.put('/', updateSettingsHandler)
router.post('/logo', uploadLogoHandler)

export default router
