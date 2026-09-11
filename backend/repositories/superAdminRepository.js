import { pool } from '../database/pool.js'

// Maps a DB row to a safe public object — password_hash is deliberately omitted.
const mapSuperAdmin = (row) =>
  row && {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

/**
 * Returns all users with role = 'super_admin', ordered by creation date.
 * password_hash is never included in the returned objects.
 */
export async function listSuperAdmins() {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active, created_at, updated_at
     FROM users
     WHERE role = 'super_admin'
     ORDER BY created_at ASC`,
  )
  return result.rows.map(mapSuperAdmin)
}

/**
 * Inserts a new super_admin user.
 * branch_id is ALWAYS NULL — it is never accepted from outside this function.
 * Returns the newly created user without password_hash.
 */
export async function createSuperAdmin({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, branch_id, can_login)
     VALUES ($1, $2, $3, 'super_admin', NULL, TRUE)
     RETURNING id, name, email, role, is_active, created_at, updated_at`,
    [name, email, passwordHash],
  )
  return mapSuperAdmin(result.rows[0])
}

/**
 * Checks whether an email is already registered (any role).
 * Used for a friendly duplicate-email error before hitting the DB UNIQUE constraint.
 */
export async function emailExists(email) {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
    [email],
  )
  return result.rowCount > 0
}

/**
 * Returns the count of currently active super_admin accounts.
 * Used by the deactivation guard to prevent removing the last one.
 */
export async function countActiveSuperAdmins() {
  const result = await pool.query(
    `SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND is_active = TRUE`,
  )
  return parseInt(result.rows[0].count, 10)
}

/**
 * Deactivates a super_admin:
 *   - sets is_active = FALSE
 *   - increments session_version so all live JWTs for this user become invalid
 * Returns the updated record (without password_hash).
 * Throws if the target does not exist or is not a super_admin.
 */
export async function deactivateSuperAdmin(targetId) {
  const result = await pool.query(
    `UPDATE users
     SET is_active = FALSE,
         session_version = session_version + 1,
         updated_at = NOW()
     WHERE id = $1
       AND role = 'super_admin'
     RETURNING id, name, email, role, is_active, created_at, updated_at`,
    [targetId],
  )
  return mapSuperAdmin(result.rows[0]) ?? null
}
