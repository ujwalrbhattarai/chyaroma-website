import { pool } from '../database/pool.js'

const mapUser = (row) =>
  row && {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    branchId: row.branch_id,
    isActive: row.is_active,
    canLogin: row.can_login,           // ← NEW: explicit login-enabled flag
    sessionVersion: row.session_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

export async function findByEmail(email) {
  return mapUser((await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0])
}

export async function findById(id) {
  return mapUser((await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0])
}

/**
 * Creates a user record.
 * `canLogin` controls whether the record is an authentication account.
 *   true  → real login account; passwordHash must be provided.
 *   false → staff-only record; passwordHash must be null.
 */
export async function create({ name, email, passwordHash, role, branchId, canLogin = false }) {
  return mapUser(
    (
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role, branch_id, can_login) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, email, passwordHash ?? null, role, branchId, canLogin],
      )
    ).rows[0],
  )
}

export async function incrementSessionVersion(id) {
  await pool.query('UPDATE users SET session_version = session_version + 1, updated_at = NOW() WHERE id = $1', [id])
}

export async function listByRoles({ roles, branchId, includeInactive = true }) {
  const rolePlaceholders = roles.map((_, index) => `$${index + 1}`).join(', ')
  const values = [...roles]
  const filters = [`role IN (${rolePlaceholders})`]
  if (branchId !== undefined) {
    values.push(branchId)
    filters.push(`branch_id = $${values.length}`)
  }
  if (!includeInactive) filters.push('is_active = TRUE')
  return (await pool.query(`SELECT * FROM users WHERE ${filters.join(' AND ')} ORDER BY name ASC`, values)).rows.map(mapUser)
}

export async function listManagedStaff({ branchId, includeInactive = true } = {}) {
  const filters = [`role <> 'super_admin'`]
  const values = []
  if (branchId !== undefined) {
    values.push(branchId)
    filters.push(`branch_id = $${values.length}`)
  }
  if (!includeInactive) filters.push('is_active = TRUE')
  return (await pool.query(`SELECT * FROM users WHERE ${filters.join(' AND ')} ORDER BY name ASC`, values)).rows.map(mapUser)
}

export async function findByRoleAndBranch({ role, branchId, includeInactive = true }) {
  const values = [role]
  let query = 'SELECT * FROM users WHERE role = $1'
  if (branchId !== undefined) { values.push(branchId); query += ` AND branch_id = $2` }
  if (!includeInactive) query += ' AND is_active = TRUE'
  return mapUser((await pool.query(query, values)).rows[0])
}

export async function deactivateUser(id) {
  return mapUser((await pool.query('UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *', [id])).rows[0])
}

// Reuse an existing (deactivated) user row for the same email instead of hitting the unique
// email constraint: sets the new details and brings the account back as active.
export async function reactivateUser(id, { name, email, passwordHash, role, branchId, canLogin }) {
  return mapUser((await pool.query(
    `UPDATE users SET name=$2, email=$3, password_hash=$4, role=$5, branch_id=$6, can_login=$7,
       is_active=TRUE, session_version=0, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [id, name, email, passwordHash ?? null, role, branchId, canLogin],
  )).rows[0])
}

// Permanently remove a staff member. Safe: every FK referencing users(id) is ON DELETE SET NULL.
export async function deleteUser(id) {
  const res = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
  return res.rows[0] ?? null
}
