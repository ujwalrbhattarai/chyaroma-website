import { pool } from '../database/pool.js'
const mapIngredient = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  name: row.name,
  unit: row.unit,
  stockQuantity: Number(row.stock_quantity),
  lowStockThreshold: Number(row.low_stock_threshold),
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
const mapPurchase = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  ingredientId: row.ingredient_id,
  supplierId: row.supplier_id,
  quantity: Number(row.quantity),
  unitCost: Number(row.unit_cost),
  purchaseDate: row.purchase_date,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function listIngredients(branchId) { return (await pool.query('SELECT * FROM ingredients WHERE branch_id = $1 ORDER BY name ASC', [branchId])).rows.map(mapIngredient) }
export async function findIngredientById(id, branchId) { return mapIngredient((await pool.query('SELECT * FROM ingredients WHERE id = $1 AND branch_id = $2', [id, branchId])).rows[0]) }
export async function createIngredient(branchId, payload) { return mapIngredient((await pool.query('INSERT INTO ingredients (branch_id, name, unit, stock_quantity, low_stock_threshold) VALUES ($1, $2, $3, $4, $5) RETURNING *', [branchId, payload.name, payload.unit, payload.stockQuantity, payload.lowStockThreshold])).rows[0]) }
export async function updateIngredientStock(id, branchId, stockQuantity) { return mapIngredient((await pool.query('UPDATE ingredients SET stock_quantity = $3, updated_at = NOW() WHERE id = $1 AND branch_id = $2 RETURNING *', [id, branchId, stockQuantity])).rows[0]) }
export async function listLowStockIngredients(branchId) { return (await pool.query('SELECT * FROM ingredients WHERE branch_id = $1 AND stock_quantity <= low_stock_threshold ORDER BY name ASC', [branchId])).rows.map(mapIngredient) }
export async function listPurchases(branchId) { return (await pool.query('SELECT * FROM purchases WHERE branch_id = $1 ORDER BY created_at DESC', [branchId])).rows.map(mapPurchase) }
export async function createPurchase(branchId, payload) {
  // Restocking must also increase the ingredient's current stock, atomically.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ing = (await client.query('SELECT stock_quantity FROM ingredients WHERE id = $1 AND branch_id = $2 FOR UPDATE', [payload.ingredientId, branchId])).rows[0]
    if (!ing) throw new Error('Ingredient not found')
    const newStock = Number(ing.stock_quantity) + Number(payload.quantity)
    await client.query('UPDATE ingredients SET stock_quantity = $3, updated_at = NOW() WHERE id = $1 AND branch_id = $2', [payload.ingredientId, branchId, newStock])
    const res = await client.query('INSERT INTO purchases (branch_id, ingredient_id, supplier_id, quantity, unit_cost, purchase_date, notes) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7) RETURNING *', [branchId, payload.ingredientId, payload.supplierId ?? null, payload.quantity, payload.unitCost ?? 0, payload.purchaseDate ?? null, payload.notes ?? ''])
    await client.query('COMMIT')
    return mapPurchase(res.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
