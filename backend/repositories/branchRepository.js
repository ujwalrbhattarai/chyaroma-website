import { pool } from '../database/pool.js'
const mapBranch = (row) => row && ({
  id: row.id,
  name: row.name,
  address: row.address,
  contactPhone: row.contact_phone,
  contactEmail: row.contact_email,
  taxRate: Number(row.tax_rate),
  openingHours: row.opening_hours,
  isActive: row.is_active,
  isDemo: row.is_demo ?? false,
  deactivatedAt: row.deactivated_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function listBranches() {
  // Exclude the Demo Branch — it is managed separately under the Demo section
  return (await pool.query("SELECT * FROM branches WHERE (is_demo IS NULL OR is_demo = FALSE) AND LOWER(name) NOT LIKE '%demo%' ORDER BY name ASC")).rows.map(mapBranch)
}
export async function findBranchById(id) {
  return mapBranch((await pool.query('SELECT * FROM branches WHERE id = $1', [id])).rows[0])
}
export async function createBranch({ name, address, contactPhone, contactEmail, taxRate, openingHours }) {
  return mapBranch((await pool.query(
    'INSERT INTO branches (name, address, contact_phone, contact_email, tax_rate, opening_hours) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, address, contactPhone, contactEmail, taxRate, openingHours],
  )).rows[0])
}
export async function updateBranch(id, { name, address, contactPhone, contactEmail, taxRate, openingHours, isActive }) {
  return mapBranch((await pool.query(
    `UPDATE branches
     SET name = $2,
         address = $3,
         contact_phone = $4,
         contact_email = $5,
         tax_rate = $6,
         opening_hours = $7,
         is_active = $8,
         deactivated_at = CASE WHEN $8 = FALSE THEN COALESCE(deactivated_at, NOW()) ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name, address, contactPhone, contactEmail, taxRate, openingHours, isActive],
  )).rows[0])
}
export async function deactivateBranch(id) {
  return mapBranch((await pool.query(
    'UPDATE branches SET is_active = FALSE, deactivated_at = COALESCE(deactivated_at, NOW()), updated_at = NOW() WHERE id = $1 RETURNING *',
    [id],
  )).rows[0])
}
