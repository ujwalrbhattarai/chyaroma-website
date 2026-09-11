import { pool } from '../database/pool.js'
const mapOrder = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  tableId: row.table_id,
  status: row.status,
  notes: row.notes,
  cancellationReason: row.cancellation_reason,
  cancellationLockedAt: row.cancellation_locked_at,
  acceptedAt: row.accepted_at,
  preparingAt: row.preparing_at,
  readyAt: row.ready_at,
  completedAt: row.completed_at,
  cancelledAt: row.cancelled_at,
  customerVisible: row.customer_visible,
  deviceId: row.device_id ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function createOrder({ branchId, tableId, notes, deviceId }) {
  return mapOrder((await pool.query(
    'INSERT INTO orders (branch_id, table_id, status, notes, device_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [branchId, tableId, 'pending', notes ?? '', deviceId ?? null],
  )).rows[0])
}
export async function findOrderById(id, branchId) {
  return mapOrder((await pool.query('SELECT * FROM orders WHERE id = $1 AND branch_id = $2', [id, branchId])).rows[0])
}
export async function listOrdersByTable(branchId, tableId) {
  return (await pool.query('SELECT * FROM orders WHERE branch_id = $1 AND table_id = $2 ORDER BY created_at DESC', [branchId, tableId])).rows.map(mapOrder)
}
export async function listOpenOrdersByBranch(branchId) {
  // Exclude demo orders from the real kitchen queue
  return (await pool.query("SELECT * FROM orders WHERE branch_id = $1 AND status IN ('pending', 'accepted', 'preparing', 'ready') AND is_demo = FALSE ORDER BY created_at ASC", [branchId])).rows.map(mapOrder)
}
export async function updateOrderStatus(id, branchId, status, fields = {}) {
  return mapOrder((await pool.query(
    `UPDATE orders
     SET status = $3,
         cancellation_locked_at = COALESCE(cancellation_locked_at, $4),
         accepted_at = COALESCE(accepted_at, $5),
         preparing_at = COALESCE(preparing_at, $6),
         ready_at = COALESCE(ready_at, $7),
         completed_at = COALESCE(completed_at, $8),
         cancelled_at = COALESCE(cancelled_at, $9),
         cancellation_reason = COALESCE($10, cancellation_reason),
         updated_at = NOW()
     WHERE id = $1 AND branch_id = $2
     RETURNING *`,
    [id, branchId, status, fields.cancellationLockedAt ?? null, fields.acceptedAt ?? null, fields.preparingAt ?? null, fields.readyAt ?? null, fields.completedAt ?? null, fields.cancelledAt ?? null, fields.cancellationReason ?? null],
  )).rows[0])
}
export async function listOrdersReadyForBilling(branchId, tableId) {
  // Exclude demo orders from real billing calculations
  return (await pool.query("SELECT * FROM orders WHERE branch_id = $1 AND table_id = $2 AND status != 'cancelled' AND is_demo = FALSE ORDER BY created_at ASC", [branchId, tableId])).rows.map(mapOrder)
}
export async function listActiveOrdersByTable(branchId, tableId) {
  return (await pool.query("SELECT * FROM orders WHERE branch_id = $1 AND table_id = $2 AND status NOT IN ('cancelled', 'completed') ORDER BY created_at ASC", [branchId, tableId])).rows.map(mapOrder)
}
export async function listCustomerVisibleOrdersByTable(branchId, tableId) {
  // Only return orders that are still visible to the current customer session.
  // After checkout, orders are marked customer_visible = FALSE so the next
  // customer scanning the same table cannot see the previous guest's history.
  return (await pool.query("SELECT * FROM orders WHERE branch_id = $1 AND table_id = $2 AND status != 'cancelled' AND customer_visible = TRUE ORDER BY created_at ASC", [branchId, tableId])).rows.map(mapOrder)
}
export async function completeTableOrders(branchId, tableId) {
  return (await pool.query(
    "UPDATE orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE branch_id = $1 AND table_id = $2 AND status NOT IN ('cancelled', 'completed') RETURNING *",
    [branchId, tableId],
  )).rows.map(mapOrder)
}
export async function hideTableOrdersFromCustomer(branchId, tableId) {
  // Mark all orders for this table as no longer visible to customers.
  // Called after checkout is approved so the next guest cannot see the
  // previous customer's order history.
  return (await pool.query(
    "UPDATE orders SET customer_visible = FALSE, updated_at = NOW() WHERE branch_id = $1 AND table_id = $2 AND customer_visible = TRUE RETURNING *",
    [branchId, tableId],
  )).rows.map(mapOrder)
}
export async function cancelPendingOrdersByTable(branchId, tableId) {
  return (await pool.query(
    "UPDATE orders SET status = 'cancelled', cancellation_reason = 'Table released by customer', cancellation_locked_at = NOW(), cancelled_at = NOW(), updated_at = NOW() WHERE branch_id = $1 AND table_id = $2 AND status NOT IN ('cancelled', 'completed') RETURNING *",
    [branchId, tableId],
  )).rows.map(mapOrder)
}