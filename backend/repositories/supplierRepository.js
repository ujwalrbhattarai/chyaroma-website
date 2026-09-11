import { pool } from '../database/pool.js'
const mapSupplier = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  name: row.name,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  contactEmail: row.contact_email,
  address: row.address,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function listSuppliers(branchId) { return (await pool.query('SELECT * FROM suppliers WHERE branch_id = $1 ORDER BY name ASC', [branchId])).rows.map(mapSupplier) }
export async function createSupplier(branchId, payload) { return mapSupplier((await pool.query('INSERT INTO suppliers (branch_id, name, contact_name, contact_phone, contact_email, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [branchId, payload.name, payload.contactName, payload.contactPhone, payload.contactEmail, payload.address])).rows[0]) }
export async function findSupplierById(id, branchId) { return mapSupplier((await pool.query('SELECT * FROM suppliers WHERE id = $1 AND branch_id = $2', [id, branchId])).rows[0]) }
