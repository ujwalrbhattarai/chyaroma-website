import { pool } from '../database/pool.js'
const mapSettings = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  taxRate: Number(row.tax_rate),
  cancellationWindowMinutes: row.cancellation_window_minutes,
  lowStockThreshold: Number(row.low_stock_threshold),
  receiptFooter: row.receipt_footer,
  cafeName: row.cafe_name,
  logoUrl: row.logo_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function findSettingsByBranch(branchId) { return mapSettings((await pool.query('SELECT * FROM settings WHERE branch_id = $1', [branchId])).rows[0]) }
export async function upsertSettings(branchId, payload) { return mapSettings((await pool.query('INSERT INTO settings (branch_id, tax_rate, cancellation_window_minutes, low_stock_threshold, receipt_footer, cafe_name, logo_url) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (branch_id) DO UPDATE SET tax_rate = EXCLUDED.tax_rate, cancellation_window_minutes = EXCLUDED.cancellation_window_minutes, low_stock_threshold = EXCLUDED.low_stock_threshold, receipt_footer = EXCLUDED.receipt_footer, cafe_name = EXCLUDED.cafe_name, logo_url = EXCLUDED.logo_url, updated_at = NOW() RETURNING *', [branchId, payload.taxRate, payload.cancellationWindowMinutes, payload.lowStockThreshold, payload.receiptFooter, payload.cafeName, payload.logoUrl])).rows[0]) }
