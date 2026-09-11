/**
 * demoStatsRepository.js
 *
 * Database queries for Demo-specific statistics.
 * All queries are scoped exclusively to is_demo = TRUE records.
 * Never mixed with real business data.
 */

import { pool } from '../database/pool.js'

/**
 * Returns order counts broken down by status for demo orders.
 */
export async function demoOrderStatusCounts() {
  const res = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM orders
     WHERE is_demo = TRUE
     GROUP BY status
     ORDER BY count DESC`,
  )
  return res.rows
}

/**
 * Returns total demo order count (excluding cancelled).
 */
export async function demoTotalOrders() {
  const res = await pool.query(
    "SELECT COUNT(*)::int AS count FROM orders WHERE is_demo = TRUE AND status != 'cancelled'",
  )
  return res.rows[0].count
}

/**
 * Returns demo revenue: today and all-time (from finalized demo bills).
 */
export async function demoRevenueStats() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const res = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN checkout_approved_at >= $1 THEN total_amount ELSE 0 END), 0)::numeric AS revenue_today,
       COALESCE(SUM(total_amount), 0)::numeric AS revenue_total,
       COUNT(*)::int AS bill_count,
       COUNT(CASE WHEN checkout_approved_at >= $1 THEN 1 END)::int AS bill_count_today
     FROM bills
     WHERE is_demo = TRUE
       AND status = 'finalized'
       AND checkout_approved_at IS NOT NULL`,
    [todayStart.toISOString()],
  )
  const row = res.rows[0]
  return {
    revenueToday: Number(row.revenue_today),
    revenueTotal: Number(row.revenue_total),
    billCount: row.bill_count,
    billCountToday: row.bill_count_today,
  }
}

/**
 * Returns the most popular menu items ordered via demo sessions.
 */
export async function demoTopItems(limit = 8) {
  const res = await pool.query(
    `SELECT oi.name, SUM(oi.quantity)::int AS qty, SUM(oi.unit_price * oi.quantity)::numeric AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.is_demo = TRUE AND o.status != 'cancelled'
     GROUP BY oi.name
     ORDER BY qty DESC, revenue DESC
     LIMIT $1`,
    [limit],
  )
  return res.rows.map((r) => ({ name: r.name, qty: r.qty, revenue: Number(r.revenue) }))
}

/**
 * Returns demo session counts: total sessions ever and currently active (not expired).
 */
export async function demoSessionStats() {
  const res = await pool.query(
    `SELECT
       COUNT(*)::int AS total_sessions,
       COUNT(CASE WHEN expires_at > NOW() THEN 1 END)::int AS active_sessions
     FROM demo_sessions`,
  )
  const row = res.rows[0]
  return {
    totalSessions: row.total_sessions,
    activeSessions: row.active_sessions,
  }
}

/**
 * Returns recent demo orders (last 20) for a live feed view.
 */
export async function demoRecentOrders(limit = 20) {
  const res = await pool.query(
    `SELECT id, status, notes, created_at, completed_at, cancelled_at, demo_session_id
     FROM orders
     WHERE is_demo = TRUE
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  )
  return res.rows.map((r) => ({
    id: r.id,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    demoSessionId: r.demo_session_id,
    demoOrderNumber: `D-${r.id.slice(0, 6).toUpperCase()}`,
  }))
}
