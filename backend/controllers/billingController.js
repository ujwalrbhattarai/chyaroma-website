import { addAdjustment, approveCheckout, checkoutPublicBill, completeCashPayment, finalizeBill, generateBill, getTableBillByNumber, listBranchBills, mutateBillAttempt, recordPayment, requestPublicBill } from '../services/billingService.js'

export async function generateBillHandler(request, response, next) {
  try {
    response.status(201).json({ bill: await generateBill(request.user.branchId, request.body.tableId) })
  } catch (error) { next(error) }
}

export async function publicRequestBillHandler(request, response, next) {
  try {
    response.status(201).json({ bill: await requestPublicBill(request.body.token) })
  } catch (error) { next(error) }
}

export async function publicCheckoutBillHandler(request, response, next) {
  try {
    response.status(200).json({ bill: await checkoutPublicBill(request.body.token, request.body.billId, request.body.method) })
  } catch (error) { next(error) }
}

export async function listBranchBillsHandler(request, response, next) {
  try {
    response.status(200).json({ bills: await listBranchBills(request.user.branchId) })
  } catch (error) { next(error) }
}

export async function getTableBillHandler(request, response, next) {
  try {
    const { tableNumber } = request.params
    const branchId = request.user.role === 'super_admin' ? (request.query.branchId || request.user.branchId) : request.user.branchId
    const data = await getTableBillByNumber(branchId, tableNumber)
    response.status(200).json(data)
  } catch (error) { next(error) }
}

export async function completeCashPaymentHandler(request, response, next) {
  try {
    const branchId = request.user.role === 'super_admin' ? null : request.user.branchId
    const cashierId = request.user.id
    const bill = await completeCashPayment(branchId, request.params.billId, cashierId)
    response.status(200).json({ bill })
  } catch (error) { next(error) }
}

export async function approveCheckoutHandler(request, response, next) {
  try {
    response.status(200).json({ bill: await approveCheckout(request.user.branchId, request.params.billId, request.body.method, request.user.id) })
  } catch (error) { next(error) }
}

export async function finalizeBillHandler(request, response, next) {
  try { response.status(200).json({ bill: await finalizeBill(request.user.branchId, request.params.billId, request.user.id) }) } catch (error) { next(error) }
}

export async function adjustBillHandler(request, response, next) {
  try { response.status(201).json({ bill: await addAdjustment(request.user.branchId, request.params.billId, request.body) }) } catch (error) { next(error) }
}

export async function updateBillHandler(request, response, next) {
  try { response.status(200).json({ bill: await mutateBillAttempt(request.user.branchId, request.params.billId, request.body) }) } catch (error) { next(error) }
}

export async function recordPaymentHandler(request, response, next) {
  try { response.status(201).json({ bill: await recordPayment(request.user.branchId, request.params.billId, request.body.amount, request.body.method) }) } catch (error) { next(error) }
}
