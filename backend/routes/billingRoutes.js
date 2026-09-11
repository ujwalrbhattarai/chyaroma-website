import { Router } from 'express'
import { adjustBillHandler, approveCheckoutHandler, completeCashPaymentHandler, finalizeBillHandler, generateBillHandler, getTableBillHandler, listBranchBillsHandler, publicCheckoutBillHandler, publicRequestBillHandler, recordPaymentHandler, updateBillHandler } from '../controllers/billingController.js'
import { requireAuthentication, requireRoles } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/public/request', publicRequestBillHandler)
router.post('/public/checkout', publicCheckoutBillHandler)

// Cashier, Branch Manager, and Super Admin can view branch bills, lookup table bills, and process payments
router.use(requireAuthentication)
router.get('/branch', requireRoles('super_admin', 'branch_manager', 'cashier'), listBranchBillsHandler)
router.get('/table/:tableNumber', requireRoles('super_admin', 'branch_manager', 'cashier'), getTableBillHandler)
router.post('/generate', requireRoles('super_admin', 'branch_manager', 'cashier'), generateBillHandler)
router.post('/:billId/approve', requireRoles('super_admin', 'branch_manager', 'cashier'), approveCheckoutHandler)
router.post('/:billId/pay-cash', requireRoles('super_admin', 'branch_manager', 'cashier'), completeCashPaymentHandler)
router.post('/:billId/pay', requireRoles('super_admin', 'branch_manager', 'cashier'), recordPaymentHandler)

// Advanced administrative billing routes restricted to managers and super admins
router.patch('/:billId/finalize', requireRoles('super_admin', 'branch_manager'), finalizeBillHandler)
router.patch('/:billId', requireRoles('super_admin', 'branch_manager'), updateBillHandler)
router.post('/:billId/adjustments', requireRoles('super_admin', 'branch_manager'), adjustBillHandler)

export default router
