import { pool } from '../database/pool.js'

const mapTransfer = (row) => row && {
  id: row.id,
  deviceId: row.device_id,
  branchId: row.branch_id,
  fromTableId: row.from_table_id,
  fromTableNumber: row.from_table_number ?? null,
  fromLabel: row.from_table_label ?? null,
  toTableId: row.to_table_id,
  toTableNumber: row.to_table_number ?? null,
  toLabel: row.to_table_label ?? null,
  status: row.status,
  resolvedBy: row.resolved_by,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
}

// Tables where this device still has an open (unpaid) tab: a non-cancelled order that is
// NOT yet fully covered by an approved (paid) bill.
export async function getDeviceActiveTables(deviceId) {
  if (!deviceId) return []
  const res = await pool.query(
    `SELECT DISTINCT o.table_id
     FROM orders o
     WHERE o.device_id = $1
       AND o.status != 'cancelled'
       AND NOT EXISTS (
         SELECT 1 FROM bills b
         WHERE b.checkout_approved_at IS NOT NULL
           AND jsonb_typeof(b.order_ids) = 'array'
           AND b.order_ids @> to_jsonb(ARRAY[o.id::text])
       )`,
    [deviceId],
  )
  return res.rows.map((r) => r.table_id)
}

export async function findPendingByDeviceAndTarget(deviceId, toTableId) {
  const res = await pool.query(
    `SELECT t.*, ft.table_number AS from_table_number, ft.label AS from_table_label,
            tt.table_number AS to_table_number, tt.label AS to_table_label
     FROM table_transfer_requests t
     JOIN branch_tables ft ON ft.id = t.from_table_id
     JOIN branch_tables tt ON tt.id = t.to_table_id
     WHERE t.device_id = $1 AND t.to_table_id = $2 AND t.status = 'pending'
     ORDER BY t.created_at DESC LIMIT 1`,
    [deviceId, toTableId],
  )
  return mapTransfer(res.rows[0])
}

export async function createPendingTransfer({ deviceId, branchId, fromTableId, toTableId }) {
  const res = await pool.query(
    `INSERT INTO table_transfer_requests (device_id, branch_id, from_table_id, to_table_id, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [deviceId, branchId, fromTableId, toTableId],
  )
  return res.rows[0]
}

export async function listPendingTransfers(branchId) {
  const res = await pool.query(
    `SELECT t.*, ft.table_number AS from_table_number, ft.label AS from_table_label,
            tt.table_number AS to_table_number, tt.label AS to_table_label
     FROM table_transfer_requests t
     JOIN branch_tables ft ON ft.id = t.from_table_id
     JOIN branch_tables tt ON tt.id = t.to_table_id
     WHERE t.branch_id = $1 AND t.status = 'pending'
     ORDER BY t.created_at ASC`,
    [branchId],
  )
  return res.rows.map(mapTransfer)
}

export async function getTransferRequest(id) {
  const res = await pool.query(
    `SELECT t.*, ft.table_number AS from_table_number, ft.label AS from_table_label,
            tt.table_number AS to_table_number, tt.label AS to_table_label
     FROM table_transfer_requests t
     JOIN branch_tables ft ON ft.id = t.from_table_id
     JOIN branch_tables tt ON tt.id = t.to_table_id
     WHERE t.id = $1`,
    [id],
  )
  return mapTransfer(res.rows[0])
}

export async function resolveTransferRequest(id, status, resolvedBy) {
  const res = await pool.query(
    `UPDATE table_transfer_requests
     SET status = $2, resolved_by = $3, resolved_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, status, resolvedBy],
  )
  return mapTransfer(res.rows[0])
}

// True if this device still has any open (unpaid) order on the given table.
export async function deviceHasOpenTabOnTable(deviceId, tableId) {
  if (!deviceId) return false
  const res = await pool.query(
    `SELECT EXISTS(
       SELECT 1 FROM orders o
       WHERE o.device_id = $1 AND o.table_id = $2
         AND o.status != 'cancelled'
         AND NOT EXISTS (
           SELECT 1 FROM bills b
           WHERE b.checkout_approved_at IS NOT NULL
             AND jsonb_typeof(b.order_ids) = 'array'
             AND b.order_ids @> to_jsonb(ARRAY[o.id::text])
         )
     ) AS owned`,
    [deviceId, tableId],
  )
  return res.rows[0]?.owned ?? false
}

// Move all of a device's open orders (and the draft bill that holds them) from one
// table to another so the person stays accountable at the destination table.
export async function transferTab(branchId, deviceId, fromTableId, toTableId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      "UPDATE orders SET table_id = $1, updated_at = NOW() WHERE branch_id = $2 AND table_id = $3 AND device_id = $4 AND status != 'cancelled'",
      [toTableId, branchId, fromTableId, deviceId],
    )
    await client.query(
      `UPDATE bills b SET table_id = $1, updated_at = NOW()
       FROM orders o
       WHERE b.branch_id = $2 AND b.table_id = $3 AND b.status = 'draft'
         AND o.branch_id = $2 AND o.table_id = $3 AND o.device_id = $4 AND o.status != 'cancelled'
         AND jsonb_typeof(b.order_ids) = 'array'
         AND b.order_ids @> to_jsonb(ARRAY[o.id::text])`,
      [toTableId, branchId, fromTableId, deviceId],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}