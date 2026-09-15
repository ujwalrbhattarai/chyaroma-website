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

// Replace a menu item's entire formula atomically: remove the old ingredient lines and
// insert the provided ones in a single transaction. Passing an empty array clears it.
export async function replaceRecipesForItem(branchId, itemId, lines) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM recipes WHERE branch_id = $1 AND item_id = $2', [branchId, itemId])
    for (const line of lines) {
      await client.query(
        'INSERT INTO recipes (branch_id, item_id, ingredient_id, quantity_used) VALUES ($1, $2, $3, $4)',
        [branchId, itemId, line.ingredientId, line.quantityUsed],
      )
    }
    await client.query('COMMIT')
    return findRecipesByItem(branchId, itemId)
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    throw error
  } finally {
    client.release()
  }
}
