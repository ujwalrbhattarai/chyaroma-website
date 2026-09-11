import assert from 'node:assert/strict'
import { pool } from './database/pool.js'
import { deductInventoryForOrder } from './services/inventoryDeduction.js'

const BASE_URL = 'http://localhost:3000/api'

function extractCookie(res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || '']
  for (const c of setCookies) {
    const match = c.match(/cc_access=([^;]+)/)
    if (match) return `cc_access=${match[1]}`
  }
  const single = res.headers.get('set-cookie') || ''
  const m = single.match(/cc_access=([^;]+)/)
  return m ? `cc_access=${m[1]}` : ''
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data, headers: res.headers, rawRes: res }
}

async function main() {
  console.log('================================================================')
  console.log(' STARTING END-TO-END AUTOMATED VERIFICATION')
  console.log('================================================================')

  // Step 0: Ensure a non-demo branch exists
  const branchRes = await pool.query(
    "SELECT id, name FROM branches WHERE is_demo = FALSE AND is_active = TRUE LIMIT 1"
  )
  let branchId
  if (branchRes.rowCount === 0) {
    const newBranch = await pool.query(
      "INSERT INTO branches (name, address, phone) VALUES ('Kathmandu Flagship', 'Thamel, Kathmandu', '01-4412345') RETURNING id"
    )
    branchId = newBranch.rows[0].id
    console.log('Created test branch:', branchId)
  } else {
    branchId = branchRes.rows[0].id
    console.log(`Using existing branch: ${branchRes.rows[0].name} (${branchId})`)
  }

  // ── 1. Create a Cashier with email, password, role=cashier, can_login=TRUE ─
  console.log('\n--> Step 1: Login as Super Admin and create a Cashier account...')
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'ujwalrajbhattarai1234@gmail.com',
      password: '12345678',
    }),
  })
  if (adminLogin.status !== 200) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`)
  }
  const adminCookie = extractCookie(adminLogin)
  if (!adminCookie) throw new Error('Could not extract admin cc_access cookie!')
  console.log('✓ Super Admin logged in successfully.')

  const cashierEmail = `cashier_${Date.now()}@chyaroma.com`
  const cashierPassword = 'CashierPassword123!'
  const createStaffRes = await request('/staff', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      name: 'Sunita Cashier',
      email: cashierEmail,
      role: 'cashier',
      branchId,
      password: cashierPassword,
    }),
  })
  if (createStaffRes.status !== 201) {
    throw new Error(`Failed to create Cashier: ${JSON.stringify(createStaffRes.data)}`)
  }
  const createdCashier = createStaffRes.data.staff
  console.log('✓ Cashier created:', {
    id: createdCashier.id,
    name: createdCashier.name,
    role: createdCashier.role,
    canLogin: createdCashier.canLogin,
    branchId: createdCashier.branchId,
  })
  if (createdCashier.role !== 'cashier' || createdCashier.canLogin !== true) {
    throw new Error('Cashier record must have role=cashier and canLogin=true!')
  }

  // ── 2. Authenticate as Cashier ─────────────────────────────────────────────
  console.log('\n--> Step 2: Authenticate as Cashier...')
  const cashierLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: cashierEmail,
      password: cashierPassword,
    }),
  })
  if (cashierLogin.status !== 200) {
    throw new Error(`Cashier login failed: ${JSON.stringify(cashierLogin.data)}`)
  }
  const cashierCookie = extractCookie(cashierLogin)
  if (!cashierCookie) throw new Error('Could not extract cashier cc_access cookie!')
  const cashierUser = cashierLogin.data.user
  console.log('✓ Cashier logged in:', {
    id: cashierUser.id,
    role: cashierUser.role,
    branchId: cashierUser.branchId,
  })

  // ── 3. Role-Based Permissions Enforcement ──────────────────────────────────
  console.log('\n--> Step 3: Verify Cashier cannot access administrative routes...')
  const staffAccess = await request('/staff', {
    headers: { Cookie: cashierCookie },
  })
  console.log(`- Cashier accessing /staff -> status ${staffAccess.status} (Forbidden expected: 403)`)
  assert.equal(staffAccess.status, 403)

  const inventoryAccess = await request('/inventory/ingredients', {
    headers: { Cookie: cashierCookie },
  })
  console.log(`- Cashier accessing /inventory/ingredients -> status ${inventoryAccess.status} (Forbidden expected: 403)`)
  assert.equal(inventoryAccess.status, 403)

  const reportsAccess = await request('/reports/overview', {
    headers: { Cookie: cashierCookie },
  })
  console.log(`- Cashier accessing /reports/overview -> status ${reportsAccess.status} (Forbidden expected: 403)`)
  assert.equal(reportsAccess.status, 403)

  const branchesAccess = await request('/branches', {
    headers: { Cookie: cashierCookie },
  })
  console.log(`- Cashier accessing /branches -> status ${branchesAccess.status} (Forbidden expected: 403)`)
  assert.equal(branchesAccess.status, 403)
  console.log('✓ Role-based access control verified for Cashier.')

  // ── 4. Inventory Restock Without Supplier ──────────────────────────────────
  console.log('\n--> Step 4: Inventory Restock without supplier information...')
  let milk = (
    await pool.query("SELECT * FROM ingredients WHERE branch_id = $1 AND name = 'Milk'", [branchId])
  ).rows[0]
  if (!milk) {
    milk = (
      await pool.query(
        "INSERT INTO ingredients (branch_id, name, unit, stock_quantity, low_stock_threshold) VALUES ($1, 'Milk', 'ml', 0, 1000) RETURNING *",
        [branchId]
      )
    ).rows[0]
  }
  const initialMilkStock = Number(milk.stock_quantity)
  console.log(`Current Milk Stock before restock: ${initialMilkStock} ml`)

  const restockRes = await request('/inventory/purchases', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({
      branchId,
      ingredientId: milk.id,
      quantity: 20000,
      // NO supplierId!
    }),
  })
  if (restockRes.status !== 201) {
    throw new Error(`Restock failed: ${JSON.stringify(restockRes.data)}`)
  }
  const milkAfterRestock = (
    await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])
  ).rows[0]
  console.log(`✓ Restock succeeded! New Milk Stock: ${milkAfterRestock.stock_quantity} ml (+20,000 ml)`)
  assert.equal(Number(milkAfterRestock.stock_quantity), initialMilkStock + 20000)

  const purchaseRow = (
    await pool.query("SELECT * FROM purchases WHERE id = $1", [restockRes.data.purchase.id])
  ).rows[0]
  console.log('✓ Purchase recorded with timestamp and NO supplier required:', {
    id: purchaseRow.id,
    quantity: purchaseRow.quantity,
    supplierId: purchaseRow.supplier_id,
    createdAt: purchaseRow.created_at,
  })
  assert.equal(purchaseRow.supplier_id, null)

  // ── 5. Setup Menu Item & Recipe ────────────────────────────────────────────
  console.log('\n--> Step 5: Setup Menu Item (Special Latte) & Recipe (200ml milk each)...')
  let category = (await pool.query("SELECT * FROM menu_categories WHERE branch_id = $1 LIMIT 1", [branchId])).rows[0]
  if (!category) {
    category = (await pool.query("INSERT INTO menu_categories (branch_id, name) VALUES ($1, 'Hot Beverages') RETURNING *", [branchId])).rows[0]
  }
  let latte = (await pool.query("SELECT * FROM menu_items WHERE branch_id = $1 AND name = 'Special Latte'", [branchId])).rows[0]
  if (!latte) {
    latte = (await pool.query(
      "INSERT INTO menu_items (branch_id, category_id, name, price, is_available) VALUES ($1, $2, 'Special Latte', 250.00, TRUE) RETURNING *",
      [branchId, category.id]
    )).rows[0]
  }
  await pool.query("DELETE FROM recipes WHERE branch_id = $1 AND item_id = $2", [branchId, latte.id])
  await pool.query(
    "INSERT INTO recipes (branch_id, item_id, ingredient_id, quantity_used) VALUES ($1, $2, $3, 200.00)",
    [branchId, latte.id, milk.id]
  )
  console.log('✓ Recipe configured: 1 Special Latte = 200ml Milk.')

  // ── 6. Order Placement & Order Status Flow ─────────────────────────────────
  console.log('\n--> Step 6: Test Order Placement, Kitchen Progress, and Strict Inventory Deduction...')
  let table12 = (await pool.query("SELECT * FROM branch_tables WHERE branch_id = $1 AND table_number = 12", [branchId])).rows[0]
  if (!table12) {
    table12 = (await pool.query(
      "INSERT INTO branch_tables (branch_id, table_number, label, qr_token) VALUES ($1, 12, 'Window Seat', 'token-tbl-12') RETURNING *",
      [branchId]
    )).rows[0]
  }

  const stockBeforeOrder = Number(
    (await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity
  )
  console.log(`Milk stock before order: ${stockBeforeOrder} ml`)

  // Customer places order for 2 Special Lattes (should consume 400ml milk ONLY when completed)
  const orderRes = await pool.query(
    "INSERT INTO orders (branch_id, table_id, status, notes) VALUES ($1, $2, 'pending', 'Extra foam') RETURNING *",
    [branchId, table12.id]
  )
  const orderId = orderRes.rows[0].id
  await pool.query(
    "INSERT INTO order_items (order_id, branch_id, item_id, name, quantity, unit_price) VALUES ($1, $2, $3, 'Special Latte', 2, 250.00)",
    [orderId, branchId, latte.id]
  )
  console.log(`Created Order #${orderId} (2x Special Latte) with status: pending`)

  // Verify stock has NOT decreased on order placement
  const stockAtPlaced = Number((await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity)
  console.log(`Milk stock at order placement: ${stockAtPlaced} ml`)
  assert.equal(stockAtPlaced, stockBeforeOrder)

  // Kitchen accepts order
  await request(`/kitchen/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ branchId, status: 'accepted' }),
  })
  const stockAtAccepted = Number((await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity)
  console.log(`Milk stock at accepted: ${stockAtAccepted} ml`)
  assert.equal(stockAtAccepted, stockBeforeOrder)

  // Kitchen starts preparing
  await request(`/kitchen/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ branchId, status: 'preparing' }),
  })
  const stockAtPreparing = Number((await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity)
  console.log(`Milk stock at preparing: ${stockAtPreparing} ml`)
  assert.equal(stockAtPreparing, stockBeforeOrder)

  // Kitchen marks ready
  await request(`/kitchen/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ branchId, status: 'ready' }),
  })
  const stockAtReady = Number((await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity)
  console.log(`Milk stock at ready: ${stockAtReady} ml`)
  assert.equal(stockAtReady, stockBeforeOrder)

  // Kitchen marks COMPLETED
  console.log('\nKitchen marks order COMPLETED...')
  const completeRes = await request(`/kitchen/orders/${orderId}`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ branchId, status: 'completed' }),
  })
  if (completeRes.status !== 200) {
    throw new Error(`Order completion transition failed: ${JSON.stringify(completeRes.data)}`)
  }

  const stockAtCompleted = Number((await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity)
  console.log(`Milk stock at completed: ${stockAtCompleted} ml (Expected: ${stockBeforeOrder - 400} ml)`)
  assert.equal(stockAtCompleted, stockBeforeOrder - 400)
  console.log('✓ Stock decreased by exactly 400 ml upon order transition to COMPLETED!')

  // ── 7. Customer Generates / Requests Bill ──────────────────────────────────
  console.log('\n--> Step 7: Customer requests bill...')
  const billReqRes = await request('/billing/public/request', {
    method: 'POST',
    body: JSON.stringify({ token: table12.qr_token }),
  })
  if (billReqRes.status !== 201) {
    throw new Error(`Public bill request failed: ${JSON.stringify(billReqRes.data)}`)
  }
  const billId = billReqRes.data.bill.id
  console.log(`✓ Draft bill synced: Bill ID ${billId}, Subtotal: Rs ${billReqRes.data.bill.subtotal}`)

  // Customer clicks checkout
  const checkoutRes = await request('/billing/public/checkout', {
    method: 'POST',
    body: JSON.stringify({ token: table12.qr_token, billId, method: 'cash' }),
  })
  if (checkoutRes.status !== 200) {
    throw new Error(`Public checkout failed: ${JSON.stringify(checkoutRes.data)}`)
  }
  console.log('✓ Customer confirmed checkout request (status: pending payment).')

  // ── 8. Cashier Table Number Lookup (Table 12) ──────────────────────────────
  console.log('\n--> Step 8: Cashier performs Table Number Lookup for Table 12...')
  const lookupRes = await request('/billing/table/12', {
    headers: { Cookie: cashierCookie },
  })
  if (lookupRes.status !== 200) {
    throw new Error(`Table lookup failed: ${JSON.stringify(lookupRes.data)}`)
  }
  const tableData = lookupRes.data
  console.log('✓ Table lookup response:', {
    tableNumber: tableData.table.tableNumber,
    billId: tableData.bill.id,
    subtotal: tableData.bill.subtotal,
    total: tableData.bill.totalAmount,
    status: tableData.bill.status,
    itemsCount: tableData.bill.items?.length,
  })
  assert.equal(tableData.table.tableNumber, 12)
  assert.equal(tableData.bill.items.length, 1)
  assert.equal(tableData.bill.items[0].name, 'Special Latte')
  assert.equal(tableData.bill.items[0].quantity, 2)
  assert.equal(Number(tableData.bill.totalAmount), 500)

  // ── 9. Cashier Completes Cash Payment ──────────────────────────────────────
  console.log('\n--> Step 9: Cashier clicks "Complete Cash Payment"...')
  const payRes = await request(`/billing/${billId}/pay-cash`, {
    method: 'POST',
    headers: { Cookie: cashierCookie },
  })
  if (payRes.status !== 200) {
    throw new Error(`Cash payment failed: ${JSON.stringify(payRes.data)}`)
  }
  const paidBill = payRes.data.bill
  console.log('✓ Cash payment completed successfully:', {
    id: paidBill.id,
    status: paidBill.status,
    checkoutApprovedAt: paidBill.checkoutApprovedAt,
    paymentMethod: paidBill.paymentMethod,
    cashierId: paidBill.cashierId,
  })
  assert.equal(paidBill.status, 'finalized')
  assert.ok(paidBill.checkoutApprovedAt)
  assert.equal(paidBill.paymentMethod, 'cash')
  assert.equal(paidBill.cashierId, cashierUser.id)

  // Verify payment table entry
  const paymentRow = (
    await pool.query("SELECT * FROM payments WHERE bill_id = $1 ORDER BY created_at DESC LIMIT 1", [billId])
  ).rows[0]
  console.log('✓ Payment record verified:', {
    method: paymentRow.method,
    amount: paymentRow.amount,
    processedBy: paymentRow.processed_by,
  })
  assert.equal(paymentRow.method, 'cash')
  assert.equal(paymentRow.processed_by, cashierUser.id)

  // Verify table is VACANT
  const tableCheck = (
    await pool.query("SELECT customer_occupied, manual_occupied FROM branch_tables WHERE id = $1", [table12.id])
  ).rows[0]
  console.log('✓ Table occupancy check:', tableCheck)
  assert.equal(tableCheck.customer_occupied, false)

  // ── 10. Verify NO Double Deduction after Payment ───────────────────────────
  console.log('\n--> Step 10: Verify stock did NOT decrease again after cash payment...')
  const stockAfterPayment = Number(
    (await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity
  )
  console.log(`Milk stock after cash payment: ${stockAfterPayment} ml (Expected unchanged: ${stockAtCompleted} ml)`)
  assert.equal(stockAfterPayment, stockAtCompleted)

  // ── 11. Repeat / Duplicate Completion Request Idempotency Check ────────────
  console.log('\n--> Step 11: Attempt duplicate inventory deduction directly on order...')
  const duplicateDeductionRes = await deductInventoryForOrder(branchId, orderId)
  console.log('Duplicate deduction result:', duplicateDeductionRes)
  assert.equal(duplicateDeductionRes.alreadyDeducted, true)

  const stockAfterDuplicate = Number(
    (await pool.query("SELECT stock_quantity FROM ingredients WHERE id = $1", [milk.id])).rows[0].stock_quantity
  )
  console.log(`Milk stock after duplicate attempt: ${stockAfterDuplicate} ml (Expected unchanged: ${stockAtCompleted} ml)`)
  assert.equal(stockAfterDuplicate, stockAtCompleted)
  console.log('✓ Database idempotency constraint successfully prevented double deduction.')

  console.log('\n================================================================')
  console.log(' ALL 11 END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! ')
  console.log('================================================================')
}

main()
  .then(async () => {
    await pool.end()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('\n❌ E2E Verification Failed:', err)
    await pool.end()
    process.exit(1)
  })
