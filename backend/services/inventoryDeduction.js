import { pool } from '../database/pool.js'

/**
 * Automatically reduce ingredient stock for a completed order,
 * using each item's recipe (item -> ingredient -> quantity used).
 * 
 * Guarantees:
 * 1. Transaction Safety: Executed inside a PostgreSQL transaction.
 * 2. Idempotency: order_inventory_deductions with UNIQUE(order_id) constraint.
 * 3. Pre-check Stock: If any ingredient has insufficient stock, the transaction is rolled back
 *    and no partial deduction occurs.
 * 4. Deducts ONLY when called on order completion.
 */
export async function deductInventoryForOrder(branchId, orderId, { dbClient = null } = {}) {
  const client = dbClient || (await pool.connect())
  const shouldRelease = !dbClient
  try {
    await client.query('BEGIN')

    // 1. Idempotency check: verify this order has not already had its inventory deducted
    const deductionCheck = await client.query(
      'SELECT id FROM order_inventory_deductions WHERE order_id = $1 FOR UPDATE',
      [orderId],
    )
    if (deductionCheck.rowCount > 0) {
      await client.query('COMMIT')
      return { alreadyDeducted: true }
    }

    // 2. Load order items
    const itemsRes = await client.query(
      'SELECT item_id, quantity FROM order_items WHERE order_id = $1',
      [orderId],
    )

    // 3. Aggregate ingredient requirements across all order items
    const requirements = new Map() // ingredientId -> totalNeeded
    for (const item of itemsRes.rows) {
      const recipesRes = await client.query(
        'SELECT ingredient_id, quantity_used FROM recipes WHERE branch_id = $1 AND item_id = $2',
        [branchId, item.item_id],
      )
      for (const recipe of recipesRes.rows) {
        const ingId = recipe.ingredient_id
        const needed = Number(recipe.quantity_used) * Number(item.quantity)
        requirements.set(ingId, (requirements.get(ingId) || 0) + needed)
      }
    }

    // 4. Verify stock for all required ingredients; abort if any ingredient is insufficient
    for (const [ingId, needed] of requirements.entries()) {
      const ingRes = await client.query(
        'SELECT id, name, stock_quantity, unit FROM ingredients WHERE id = $1 AND branch_id = $2 FOR UPDATE',
        [ingId, branchId],
      )
      if (ingRes.rowCount === 0) continue
      const ing = ingRes.rows[0]
      const available = Number(ing.stock_quantity)
      if (available < needed) {
        const error = Object.assign(
          new Error(`Insufficient stock for "${ing.name}". Required: ${needed} ${ing.unit}, Available: ${available} ${ing.unit}`),
          { statusCode: 400, ingredient: ing.name, required: needed, available },
        )
        throw error
      }
    }

    // 5. Deduct stock for all ingredients atomically
    for (const [ingId, needed] of requirements.entries()) {
      await client.query(
        'UPDATE ingredients SET stock_quantity = stock_quantity - $3, updated_at = NOW() WHERE id = $1 AND branch_id = $2',
        [ingId, branchId, needed],
      )
    }

    // 6. Record deduction idempotency entry (enforced by DB UNIQUE constraint)
    await client.query(
      'INSERT INTO order_inventory_deductions (order_id, branch_id) VALUES ($1, $2)',
      [orderId, branchId],
    )

    await client.query('COMMIT')
    return { success: true, alreadyDeducted: false }
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback errors if already aborted
    }
    throw error
  } finally {
    if (shouldRelease) client.release()
  }
}
