import { pool } from '../database/pool.js'
const mapPayment = (row) => row && ({
  id: row.id,
  billId: row.bill_id,
  branchId: row.branch_id,
  amount: Number(row.amount),
  method: row.method,
  processedBy: row.processed_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function createPayment({ billId, branchId, amount, method, processedBy = null }) {
  return mapPayment((await pool.query('INSERT INTO payments (bill_id, branch_id, amount, method, processed_by) VALUES ($1, $2, $3, $4, $5) RETURNING *', [billId, branchId, amount, method, processedBy])).rows[0])
}
export async function listPaymentsByBill(billId, branchId) { return (await pool.query('SELECT * FROM payments WHERE bill_id = $1 AND branch_id = $2 ORDER BY created_at ASC', [billId, branchId])).rows.map(mapPayment) }
