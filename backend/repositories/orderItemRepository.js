import { pool } from '../database/pool.js'
const mapOrderItem = (row) => row && ({
  id: row.id,
  orderId: row.order_id,
  branchId: row.branch_id,
  itemId: row.item_id,
  name: row.name,
  unitPrice: Number(row.unit_price),
  quantity: row.quantity,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function listOrderItems(orderId, branchId) {
  return (await pool.query('SELECT * FROM order_items WHERE order_id = $1 AND branch_id = $2 ORDER BY created_at ASC', [orderId, branchId])).rows.map(mapOrderItem)
}
export async function createOrderItem({ orderId, branchId, itemId, name, unitPrice, quantity, notes }) {
  return mapOrderItem((await pool.query(
    'INSERT INTO order_items (order_id, branch_id, item_id, name, unit_price, quantity, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [orderId, branchId, itemId, name, unitPrice, quantity, notes ?? ''],
  )).rows[0])
}
