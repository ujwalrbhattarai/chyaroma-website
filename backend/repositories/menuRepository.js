import { pool } from '../database/pool.js'
const mapCategory = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  name: row.name,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
const mapItem = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  categoryId: row.category_id,
  name: row.name,
  price: Number(row.price),
  description: row.description,
  imageUrl: row.image_url,
  prepTimeMinutes: row.prep_time_minutes,
  isAvailable: row.is_available,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function listCategories(branchId) { return (await pool.query('SELECT * FROM menu_categories WHERE branch_id = $1 ORDER BY sort_order ASC, name ASC', [branchId])).rows.map(mapCategory) }
export async function findCategoryById(id, branchId) { return mapCategory((await pool.query('SELECT * FROM menu_categories WHERE id = $1 AND branch_id = $2', [id, branchId])).rows[0]) }
export async function createCategory(branchId, { name, sortOrder = 0 }) { return mapCategory((await pool.query('INSERT INTO menu_categories (branch_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *', [branchId, name, sortOrder])).rows[0]) }
export async function updateCategory(id, branchId, { name, sortOrder, isActive }) { return mapCategory((await pool.query('UPDATE menu_categories SET name = $3, sort_order = $4, is_active = $5, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, name, sortOrder, isActive])).rows[0]) }
export async function deactivateCategory(id, branchId) { return mapCategory((await pool.query('UPDATE menu_categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId])).rows[0]) }
export async function listMenuItems(branchId) { return (await pool.query('SELECT * FROM menu_items WHERE branch_id = $1 ORDER BY name ASC', [branchId])).rows.map(mapItem) }
export async function findMenuItemById(id, branchId) { return mapItem((await pool.query('SELECT * FROM menu_items WHERE id = $1 AND branch_id = $2', [id, branchId])).rows[0]) }
export async function createMenuItem(branchId, { categoryId, name, price, description, imageUrl, prepTimeMinutes, isAvailable = true }) { return mapItem((await pool.query('INSERT INTO menu_items (branch_id, category_id, name, price, description, image_url, prep_time_minutes, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [branchId, categoryId, name, price, description, imageUrl, prepTimeMinutes, isAvailable])).rows[0]) }
export async function updateMenuItem(id, branchId, { categoryId, name, price, description, imageUrl, prepTimeMinutes, isAvailable }) { return mapItem((await pool.query('UPDATE menu_items SET category_id = $3, name = $4, price = $5, description = $6, image_url = $7, prep_time_minutes = $8, is_available = $9, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, categoryId, name, price, description, imageUrl, prepTimeMinutes, isAvailable])).rows[0]) }
export async function toggleMenuItemAvailability(id, branchId, isAvailable) { return mapItem((await pool.query('UPDATE menu_items SET is_available = $3, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, isAvailable])).rows[0]) }
