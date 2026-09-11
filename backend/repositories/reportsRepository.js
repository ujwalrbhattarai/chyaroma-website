import { pool } from '../database/pool.js'
function dateParam(rangeStart, rangeEnd) {
  return { from: rangeStart ? `${rangeStart}T00:00:00.000Z` : null, to: rangeEnd ? `${rangeEnd}T23:59:59.999Z` : null }
}
export async function approvedBills({ branchId = null, from = null, to = null } = {}) {
  const where = ["status = 'finalized'", 'checkout_approved_at IS NOT NULL', '(is_demo IS NULL OR is_demo = FALSE)']
  const params = []
  const { from: f, to: t } = dateParam(from, to)
  if (branchId) { params.push(branchId); where.push(`branch_id = $${params.length}`) }
  if (f) { params.push(f); where.push(`checkout_approved_at >= $${params.length}`) }
  if (t) { params.push(t); where.push(`checkout_approved_at <= $${params.length}`) }
  const res = await pool.query(
    `SELECT id, branch_id AS "branchId", table_id AS "tableId", total_amount AS total, payment_method AS method, checkout_approved_at AS "approvedAt", created_at AS "createdAt" FROM bills WHERE ${where.join(' AND ')} ORDER BY checkout_approved_at ASC`,
    params,
  )
  return res.rows.map((r) => ({ ...r, total: Number(r.total) }))
}
export async function completedOrders({ branchId = null, from = null, to = null } = {}) {
  const where = ["status = 'completed'", '(is_demo IS NULL OR is_demo = FALSE)']
  const params = []
  const { from: f, to: t } = dateParam(from, to)
  if (branchId) { params.push(branchId); where.push(`branch_id = $${params.length}`) }
  if (f) { params.push(f); where.push(`completed_at >= $${params.length}`) }
  if (t) { params.push(t); where.push(`completed_at <= $${params.length}`) }
  const res = await pool.query(`SELECT id, completed_at AS "completedAt" FROM orders WHERE ${where.join(' AND ')}`, params)
  return res.rows
}
export async function topItems({ branchId = null, from = null, to = null, limit = 8 } = {}) {
  const conds = ["o.status = 'completed'", '(o.is_demo IS NULL OR o.is_demo = FALSE)']
  const params = []
  const { from: f, to: t } = dateParam(from, to)
  if (branchId) { params.push(branchId); conds.push(`o.branch_id = $${params.length}`) }
  if (f) { params.push(f); conds.push(`o.completed_at >= $${params.length}`) }
  if (t) { params.push(t); conds.push(`o.completed_at <= $${params.length}`) }
  params.push(limit)
  const res = await pool.query(
    `SELECT oi.name, SUM(oi.quantity)::int AS qty, SUM(oi.unit_price * oi.quantity) AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE ${conds.join(' AND ')} GROUP BY oi.name ORDER BY qty DESC, revenue DESC LIMIT $${params.length}`,
    params,
  )
  return res.rows.map((r) => ({ name: r.name, qty: r.qty, revenue: Number(r.revenue) }))
}
export async function orderStatusCounts({ branchId = null, from = null, to = null } = {}) {
  const conds = ['(is_demo IS NULL OR is_demo = FALSE)']
  const params = []
  const { from: f, to: t } = dateParam(from, to)
  if (branchId) { params.push(branchId); conds.push(`branch_id = $${params.length}`) }
  if (f) { params.push(f); conds.push(`created_at >= $${params.length}`) }
  if (t) { params.push(t); conds.push(`created_at <= $${params.length}`) }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const res = await pool.query(`SELECT status, COUNT(*)::int AS count FROM orders ${where} GROUP BY status`, params)
  return res.rows
}
export async function activeOrdersCount(branchId = null) {
  const conds = ["status NOT IN ('cancelled', 'completed')", '(is_demo IS NULL OR is_demo = FALSE)']
  const params = []
  if (branchId) { params.push(branchId); conds.push(`branch_id = $${params.length}`) }
  const res = await pool.query(`SELECT COUNT(*)::int AS count FROM orders WHERE ${conds.join(' AND ')}`, params)
  return res.rows[0].count
}
