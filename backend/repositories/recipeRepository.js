import { pool } from '../database/pool.js'
const mapRecipe = (row) => row && ({
  id: row.id,
  branchId: row.branch_id,
  itemId: row.item_id,
  ingredientId: row.ingredient_id,
  quantityUsed: Number(row.quantity_used),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})
export async function listRecipes(branchId) { return (await pool.query('SELECT * FROM recipes WHERE branch_id = $1 ORDER BY item_id ASC', [branchId])).rows.map(mapRecipe) }
export async function createRecipe({ branchId, itemId, ingredientId, quantityUsed }) { return mapRecipe((await pool.query('INSERT INTO recipes (branch_id, item_id, ingredient_id, quantity_used) VALUES ($1, $2, $3, $4) RETURNING *', [branchId, itemId, ingredientId, quantityUsed])).rows[0]) }
export async function findRecipesByItem(branchId, itemId) { return (await pool.query('SELECT * FROM recipes WHERE branch_id = $1 AND item_id = $2 ORDER BY created_at ASC', [branchId, itemId])).rows.map(mapRecipe) }
