import { pool } from '../database/pool.js'

const mapBill = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  tableId: row.table_id,
  tableNumber: row.table_number ?? null,
  tableLabel: row.table_label ?? null,
  orderIds: row.order_ids,
  subtotal: Number(row.subtotal),
  taxRate: Number(row.tax_rate),
  taxAmount: Number(row.tax_amount),
  discountAmount: Number(row.discount_amount),
  totalAmount: Number(row.total_amount),
  paymentMethod: row.payment_method,
  status: row.status,
  cashierId: row.cashier_id ?? null,
  adjustmentOfBillId: row.adjustment_of_bill_id,
  immutableAt: row.immutable_at,
  checkoutRequestedAt: row.checkout_requested_at,
  checkoutApprovedAt: row.checkout_approved_at,
  checkoutRequestMethod: row.checkout_request_method,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function createBill({ branchId, tableId, orderIds, subtotal, taxRate, taxAmount, discountAmount, totalAmount, paymentMethod = null, adjustmentOfBillId = null, status = 'draft', immutableAt = null, checkoutRequestedAt = null, checkoutApprovedAt = null, checkoutRequestMethod = null }) {
  return mapBill((await pool.query(
    'INSERT INTO bills (branch_id, table_id, order_ids, subtotal, tax_rate, tax_amount, discount_amount, total_amount, payment_method, status, adjustment_of_bill_id, immutable_at, checkout_requested_at, checkout_approved_at, checkout_request_method) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *',
    [branchId, tableId, JSON.stringify(orderIds), subtotal, taxRate, taxAmount, discountAmount, totalAmount, paymentMethod, status, adjustmentOfBillId, immutableAt, checkoutRequestedAt, checkoutApprovedAt, checkoutRequestMethod],
  )).rows[0])
}

export async function findBillById(id, branchId) { return mapBill((await pool.query('SELECT * FROM bills WHERE id = $1 AND branch_id = $2', [id, branchId])).rows[0]) }
export async function findBillByIdAcrossBranches(id) { return mapBill((await pool.query('SELECT * FROM bills WHERE id = $1', [id])).rows[0]) }
export async function findDraftBillByTable(branchId, tableId) { return mapBill((await pool.query('SELECT * FROM bills WHERE branch_id = $1 AND table_id = $2 AND status = $3 ORDER BY created_at DESC LIMIT 1', [branchId, tableId, 'draft'])).rows[0]) }
export async function findLatestApprovedBillByTable(branchId, tableId) { return mapBill((await pool.query('SELECT * FROM bills WHERE branch_id = $1 AND table_id = $2 AND checkout_approved_at IS NOT NULL ORDER BY checkout_approved_at DESC LIMIT 1', [branchId, tableId])).rows[0]) }
export async function listBilledOrderIdsByTable(branchId, tableId) {
  const res = await pool.query('SELECT order_ids FROM bills WHERE branch_id = $1 AND table_id = $2', [branchId, tableId])
  const billed = new Set()
  for (const row of res.rows) {
    for (const orderId of row.order_ids ?? []) billed.add(orderId)
  }
  return [...billed]
}
export async function listBillsByTable(branchId, tableId) { return (await pool.query('SELECT * FROM bills WHERE branch_id = $1 AND table_id = $2 ORDER BY created_at DESC', [branchId, tableId])).rows.map(mapBill) }
export async function listBillsByBranch(branchId) { return (await pool.query('SELECT b.*, t.table_number, t.label AS table_label FROM bills b LEFT JOIN branch_tables t ON t.id = b.table_id WHERE b.branch_id = $1 AND (b.is_demo IS NULL OR b.is_demo = FALSE) ORDER BY b.checkout_requested_at DESC NULLS LAST, b.created_at DESC', [branchId])).rows.map(mapBill) }
export async function updateBill(id, branchId, payload) { return mapBill((await pool.query('UPDATE bills SET order_ids = COALESCE($3, order_ids), subtotal = COALESCE($4, subtotal), tax_rate = COALESCE($5, tax_rate), tax_amount = COALESCE($6, tax_amount), discount_amount = COALESCE($7, discount_amount), total_amount = COALESCE($8, total_amount), payment_method = COALESCE($9, payment_method), checkout_requested_at = COALESCE($10, checkout_requested_at), checkout_approved_at = COALESCE($11, checkout_approved_at), checkout_request_method = COALESCE($12, checkout_request_method), updated_at = NOW() WHERE id = $1 AND branch_id = $2 AND immutable_at IS NULL RETURNING *', [id, branchId, payload.orderIds ? JSON.stringify(payload.orderIds) : null, payload.subtotal, payload.taxRate, payload.taxAmount, payload.discountAmount, payload.totalAmount, payload.paymentMethod, payload.checkoutRequestedAt, payload.checkoutApprovedAt, payload.checkoutRequestMethod])).rows[0]) }
export async function finalizeBill(id, branchId, cashierId = null) { return mapBill((await pool.query('UPDATE bills SET status = $3, cashier_id = COALESCE($4, cashier_id), immutable_at = NOW(), updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, 'finalized', cashierId])).rows[0]) }
export async function finalizeBillWithApproval(id, branchId, checkoutApprovedAt = null, cashierId = null) { return mapBill((await pool.query('UPDATE bills SET status = $3, checkout_approved_at = COALESCE($4, checkout_approved_at), cashier_id = COALESCE($5, cashier_id), immutable_at = NOW(), updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, 'finalized', checkoutApprovedAt, cashierId])).rows[0]) }
export async function markBillCheckoutApproved(id, branchId, checkoutApprovedAt, cashierId = null) { return mapBill((await pool.query('UPDATE bills SET checkout_approved_at = $3, cashier_id = COALESCE($4, cashier_id), updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, checkoutApprovedAt, cashierId])).rows[0]) }
export async function updateBillAttempt(id, branchId, payload) { return mapBill((await pool.query('UPDATE bills SET subtotal = COALESCE($3, subtotal), tax_rate = COALESCE($4, tax_rate), tax_amount = COALESCE($5, tax_amount), discount_amount = COALESCE($6, discount_amount), total_amount = COALESCE($7, total_amount), payment_method = COALESCE($8, payment_method), cashier_id = COALESCE($9, cashier_id), updated_at = NOW() WHERE id = $1 AND branch_id = $2 AND immutable_at IS NULL RETURNING *', [id, branchId, payload.subtotal, payload.taxRate, payload.taxAmount, payload.discountAmount, payload.totalAmount, payload.paymentMethod, payload.cashierId ?? null])).rows[0]) }
export async function deleteDraftBillsByTable(branchId, tableId) { return (await pool.query('DELETE FROM bills WHERE branch_id = $1 AND table_id = $2 AND status = $3 RETURNING id', [branchId, tableId, 'draft'])).rows }
