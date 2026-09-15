import { pool } from '../database/pool.js'
const mapTable = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  tableNumber: row.table_number,
  label: row.label,
  qrToken: row.qr_token,
  isActive: row.is_active,
  manualOccupied: row.manual_occupied,
  customerOccupied: row.customer_occupied,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function listTables(branchId) { return (await pool.query('SELECT * FROM branch_tables WHERE branch_id = $1 ORDER BY table_number ASC', [branchId])).rows.map(mapTable) }
export async function listTablesWithOccupancy(branchId) {
  const res = await pool.query(
    `WITH approved_order_ids AS (
       SELECT b.table_id, jsonb_array_elements_text(b.order_ids) AS order_id
       FROM bills b
       WHERE b.branch_id = $1 AND b.checkout_approved_at IS NOT NULL
         AND jsonb_typeof(b.order_ids) = 'array'
         AND (b.is_demo IS NULL OR b.is_demo = FALSE)
     )
     SELECT t.*,
            EXISTS (
              SELECT 1 FROM orders o
              WHERE o.branch_id = t.branch_id AND o.table_id = t.id
                AND o.status NOT IN ('cancelled', 'completed')
                AND (o.is_demo IS NULL OR o.is_demo = FALSE)
            ) AS has_active_orders,
            EXISTS (
              SELECT 1 FROM bills b
              WHERE b.branch_id = t.branch_id AND b.table_id = t.id
                AND b.status = 'draft'
                AND (b.is_demo IS NULL OR b.is_demo = FALSE)
                AND jsonb_typeof(b.order_ids) = 'array'
                AND EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(b.order_ids) AS oid
                  WHERE oid NOT IN (
                    SELECT a.order_id FROM approved_order_ids a WHERE a.table_id = t.id
                  )
                )
            ) AS has_unpaid_draft_bill,
            -- Current running bill total for this table (what the customer would be billed
            -- right now), even if the customer has not requested a bill yet. Computed from
            -- unbilled orders plus the branch tax rate, mirroring the billing calculation.
            COALESCE(
              (
                SELECT ROUND((SUM(oi.unit_price * oi.quantity)
                       * (1 + COALESCE((SELECT s.tax_rate FROM settings s WHERE s.branch_id = t.branch_id), 0) / 100.0))::numeric, 2)
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id AND oi.branch_id = o.branch_id
                WHERE o.branch_id = t.branch_id AND o.table_id = t.id
                  AND o.status != 'cancelled'
                  AND (o.is_demo IS NULL OR o.is_demo = FALSE)
                  AND NOT EXISTS (
                    SELECT 1 FROM approved_order_ids a
                    WHERE a.table_id = t.id AND a.order_id = o.id::text
                  )
              ), 0
            ) AS current_bill_total
     FROM branch_tables t
     WHERE t.branch_id = $1
     ORDER BY t.table_number ASC`,
    [branchId],
  )
  return res.rows.map((row) => {
    const table = mapTable(row)
    const autoOccupied = row.has_active_orders || row.has_unpaid_draft_bill
    return {
      ...table,
      currentBillTotal: Number(row.current_bill_total ?? 0),
      autoOccupied,
      isOccupied: autoOccupied || row.manual_occupied || row.customer_occupied,
    }
  })
}
export async function setManualOccupied(id, branchId, manualOccupied) {
  return mapTable((await pool.query(
    'UPDATE branch_tables SET manual_occupied = $3, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *',
    [id, branchId, manualOccupied],
  )).rows[0])
}
export async function setCustomerOccupied(id, branchId, customerOccupied) {
  return mapTable((await pool.query(
    'UPDATE branch_tables SET customer_occupied = $3, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *',
    [id, branchId, customerOccupied],
  )).rows[0])
}
export async function clearTableOccupancy(id, branchId) {
  return mapTable((await pool.query(
    'UPDATE branch_tables SET customer_occupied = FALSE, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *',
    [id, branchId],
  )).rows[0])
}
export async function getTableUnpaidActivity(branchId, tableId) {
  // A table is considered to have "unpaid activity" only when there is something
  // genuinely outstanding — i.e. orders that have NOT already been covered by an
  // approved (paid) bill. Stale draft bills or duplicate unapproved finalized bills
  // that reference orders already paid must NOT block release.
  const res = await pool.query(
    `WITH approved_order_ids AS (
       SELECT DISTINCT jsonb_array_elements_text(b.order_ids) AS order_id
       FROM bills b
       WHERE b.branch_id = $1 AND b.table_id = $2
         AND b.checkout_approved_at IS NOT NULL
         AND jsonb_typeof(b.order_ids) = 'array'
     ),
     all_billed_order_ids AS (
       SELECT DISTINCT jsonb_array_elements_text(b.order_ids) AS order_id
       FROM bills b
       WHERE b.branch_id = $1 AND b.table_id = $2
         AND jsonb_typeof(b.order_ids) = 'array'
     )
     SELECT
       EXISTS (
         SELECT 1 FROM orders o
         WHERE o.branch_id = $1 AND o.table_id = $2
           AND o.status NOT IN ('cancelled', 'completed')
       ) AS has_active_orders,
       EXISTS (
         SELECT 1 FROM bills b
         WHERE b.branch_id = $1 AND b.table_id = $2
           AND b.status = 'draft'
           AND jsonb_typeof(b.order_ids) = 'array'
           AND EXISTS (
             SELECT 1 FROM jsonb_array_elements_text(b.order_ids) AS oid
             WHERE oid NOT IN (SELECT order_id FROM approved_order_ids)
           )
       ) AS has_unpaid_draft_bill,
       EXISTS (
         SELECT 1 FROM bills b
         WHERE b.branch_id = $1 AND b.table_id = $2
           AND b.status = 'finalized'
           AND b.checkout_approved_at IS NULL
           AND jsonb_typeof(b.order_ids) = 'array'
           AND EXISTS (
             SELECT 1 FROM jsonb_array_elements_text(b.order_ids) AS oid
             WHERE oid NOT IN (SELECT order_id FROM approved_order_ids)
           )
       ) AS has_unpaid_finalized_bill,
       EXISTS (
         SELECT 1 FROM orders o
         WHERE o.branch_id = $1 AND o.table_id = $2
           AND o.status = 'completed'
           AND o.id::text NOT IN (SELECT order_id FROM all_billed_order_ids)
       ) AS has_completed_unbilled_orders`,
    [branchId, tableId],
  )
  const row = res.rows[0]
  return {
    hasActiveOrders: row.has_active_orders,
    hasDraftBill: row.has_unpaid_draft_bill,
    hasUnapprovedFinalizedBill: row.has_unpaid_finalized_bill,
    hasCompletedUnbilledOrders: row.has_completed_unbilled_orders,
    hasUnpaidActivity: row.has_active_orders || row.has_unpaid_draft_bill || row.has_unpaid_finalized_bill || row.has_completed_unbilled_orders,
  }
}
export async function findTableById(id, branchId) { return mapTable((await pool.query('SELECT * FROM branch_tables WHERE id = $1 AND branch_id = $2', [id, branchId])).rows[0]) }
export async function findTableByToken(qrToken) { return mapTable((await pool.query('SELECT * FROM branch_tables WHERE qr_token = $1', [qrToken])).rows[0]) }
export async function findTableByNumber(branchId, tableNumber) { return mapTable((await pool.query('SELECT * FROM branch_tables WHERE branch_id = $1 AND table_number = $2 AND is_active = TRUE', [branchId, tableNumber])).rows[0]) }
export async function createTable(branchId, { tableNumber, label, qrToken }) { return mapTable((await pool.query('INSERT INTO branch_tables (branch_id, table_number, label, qr_token) VALUES ($1, $2, $3, $4) RETURNING *', [branchId, tableNumber, label, qrToken])).rows[0]) }
export async function updateTableToken(id, branchId, qrToken) { return mapTable((await pool.query('UPDATE branch_tables SET qr_token = $3, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, qrToken])).rows[0]) }
export async function deactivateTable(id, branchId) { return mapTable((await pool.query('UPDATE branch_tables SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId])).rows[0]) }