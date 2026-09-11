import { pool } from '../database/pool.js'

// ---------- Session ----------

export async function createDemoSession({ expiresAt }) {
  return (await pool.query(
    'INSERT INTO demo_sessions (expires_at) VALUES ($1) RETURNING *',
    [expiresAt],
  )).rows[0]
}

export async function findDemoSession(id) {
  return (await pool.query(
    'SELECT * FROM demo_sessions WHERE id = $1',
    [id],
  )).rows[0] ?? null
}

export async function deleteExpiredSessions() {
  await pool.query('DELETE FROM demo_sessions WHERE expires_at < NOW()')
}

// ---------- Demo Branch / Table bootstrap ----------

export async function upsertDemoBranch() {
  // First try to find by is_demo flag
  const existing = await pool.query(
    "SELECT id FROM branches WHERE is_demo = TRUE LIMIT 1",
  )
  if (existing.rows.length > 0) return existing.rows[0].id

  // Also check by name pattern in case migration ran before bootstrap set the flag
  const byName = await pool.query(
    "SELECT id FROM branches WHERE LOWER(name) LIKE '%demo%' LIMIT 1",
  )
  if (byName.rows.length > 0) {
    // Ensure the flag is set
    await pool.query('UPDATE branches SET is_demo = TRUE WHERE id = $1', [byName.rows[0].id])
    return byName.rows[0].id
  }

  const inserted = await pool.query(
    `INSERT INTO branches (name, address, contact_phone, contact_email, tax_rate, opening_hours, is_demo)
     VALUES ('Chyaroma Demo Branch', 'Virtual Demo Location', '0000000000', 'demo@chyaroma.np', 13.00, '00:00 - 24:00', TRUE)
     RETURNING id`,
  )
  return inserted.rows[0].id
}

/** Returns the demo branch UUID, or null if not yet bootstrapped. */
export async function getDemoBranchId() {
  const res = await pool.query('SELECT id FROM branches WHERE is_demo = TRUE LIMIT 1')
  return res.rows[0]?.id ?? null
}

export async function upsertDemoTable(branchId) {
  const existing = await pool.query(
    "SELECT id FROM branch_tables WHERE branch_id = $1 AND qr_token = 'demo-virtual-table-01' LIMIT 1",
    [branchId],
  )
  if (existing.rows.length > 0) return existing.rows[0].id
  const inserted = await pool.query(
    `INSERT INTO branch_tables (branch_id, table_number, label, qr_token, is_active)
     VALUES ($1, 0, 'DEMO-01', 'demo-virtual-table-01', TRUE)
     RETURNING id`,
    [branchId],
  )
  return inserted.rows[0].id
}

// ---------- Demo Orders ----------

const mapOrder = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  tableId: row.table_id,
  status: row.status,
  notes: row.notes,
  isDemo: row.is_demo,
  demoSessionId: row.demo_session_id,
  acceptedAt: row.accepted_at,
  preparingAt: row.preparing_at,
  readyAt: row.ready_at,
  completedAt: row.completed_at,
  cancelledAt: row.cancelled_at,
  cancellationLockedAt: row.cancellation_locked_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function createDemoOrder({ branchId, tableId, notes, demoSessionId }) {
  return mapOrder((await pool.query(
    'INSERT INTO orders (branch_id, table_id, status, notes, is_demo, demo_session_id, customer_visible) VALUES ($1, $2, $3, $4, TRUE, $5, TRUE) RETURNING *',
    [branchId, tableId, 'pending', notes ?? '', demoSessionId],
  )).rows[0])
}

export async function findDemoOrderById(orderId, demoSessionId) {
  return mapOrder((await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND demo_session_id = $2 AND is_demo = TRUE',
    [orderId, demoSessionId],
  )).rows[0])
}

export async function listDemoOrdersBySession(demoSessionId) {
  return (await pool.query(
    "SELECT * FROM orders WHERE demo_session_id = $1 AND is_demo = TRUE AND status != 'cancelled' ORDER BY created_at ASC",
    [demoSessionId],
  )).rows.map(mapOrder)
}

export async function updateDemoOrderStatus(orderId, status, fields = {}) {
  return mapOrder((await pool.query(
    `UPDATE orders
     SET status = $2,
         accepted_at       = COALESCE(accepted_at, $3),
         preparing_at      = COALESCE(preparing_at, $4),
         ready_at          = COALESCE(ready_at, $5),
         completed_at      = COALESCE(completed_at, $6),
         cancelled_at      = COALESCE(cancelled_at, $7),
         cancellation_locked_at = COALESCE(cancellation_locked_at, $8),
         cancellation_reason    = COALESCE($9, cancellation_reason),
         updated_at        = NOW()
     WHERE id = $1 AND is_demo = TRUE
     RETURNING *`,
    [
      orderId, status,
      fields.acceptedAt ?? null,
      fields.preparingAt ?? null,
      fields.readyAt ?? null,
      fields.completedAt ?? null,
      fields.cancelledAt ?? null,
      fields.cancellationLockedAt ?? null,
      fields.cancellationReason ?? null,
    ],
  )).rows[0])
}

// ---------- Demo Order Items ----------

const mapItem = (row) => row && ({
  id: row.id,
  orderId: row.order_id,
  branchId: row.branch_id,
  itemId: row.item_id,
  name: row.name,
  unitPrice: Number(row.unit_price),
  quantity: Number(row.quantity),
  notes: row.notes,
})

export async function createDemoOrderItem({ orderId, branchId, itemId, name, unitPrice, quantity, notes }) {
  return mapItem((await pool.query(
    'INSERT INTO order_items (order_id, branch_id, item_id, name, unit_price, quantity, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [orderId, branchId, itemId, name, unitPrice, quantity, notes ?? ''],
  )).rows[0])
}

export async function listDemoOrderItems(orderId) {
  return (await pool.query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [orderId],
  )).rows.map(mapItem)
}

// ---------- Demo Bills ----------

const mapBill = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  tableId: row.table_id,
  orderIds: row.order_ids,
  subtotal: Number(row.subtotal),
  taxRate: Number(row.tax_rate),
  taxAmount: Number(row.tax_amount),
  discountAmount: Number(row.discount_amount),
  totalAmount: Number(row.total_amount),
  status: row.status,
  isDemo: row.is_demo,
  demoSessionId: row.demo_session_id,
  checkoutRequestedAt: row.checkout_requested_at,
  checkoutApprovedAt: row.checkout_approved_at,
  createdAt: row.created_at,
})

export async function createDemoBill({ branchId, tableId, orderIds, subtotal, taxRate, taxAmount, discountAmount, totalAmount, demoSessionId }) {
  return mapBill((await pool.query(
    `INSERT INTO bills (branch_id, table_id, order_ids, subtotal, tax_rate, tax_amount, discount_amount, total_amount, status, is_demo, demo_session_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', TRUE, $9) RETURNING *`,
    [branchId, tableId, JSON.stringify(orderIds), subtotal, taxRate, taxAmount, discountAmount, totalAmount, demoSessionId],
  )).rows[0])
}

export async function findDemoBillBySession(demoSessionId) {
  return mapBill((await pool.query(
    "SELECT * FROM bills WHERE demo_session_id = $1 AND is_demo = TRUE AND status != 'finalized' ORDER BY created_at DESC LIMIT 1",
    [demoSessionId],
  )).rows[0])
}

export async function findDemoBillById(billId, demoSessionId) {
  return mapBill((await pool.query(
    'SELECT * FROM bills WHERE id = $1 AND demo_session_id = $2 AND is_demo = TRUE',
    [billId, demoSessionId],
  )).rows[0])
}

export async function approveDemoBill(billId) {
  return mapBill((await pool.query(
    `UPDATE bills SET status = 'finalized', checkout_approved_at = NOW(), checkout_requested_at = COALESCE(checkout_requested_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND is_demo = TRUE RETURNING *`,
    [billId],
  )).rows[0])
}
