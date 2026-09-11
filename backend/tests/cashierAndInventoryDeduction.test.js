import assert from 'node:assert/strict'
import test from 'node:test'
import argon2 from 'argon2'
import { createAuthService } from '../services/authService.js'
import { createBillingService } from '../services/billingService.js'
import { createInventoryService } from '../services/inventoryService.js'
import { deductInventoryForOrder } from '../services/inventoryDeduction.js'

const BRANCH_A = 'branch-a'
const BRANCH_B = 'branch-b'
const TABLE_A = 'table-1'
const TABLE_B = 'table-2'

// ── Test 1: Cashier Authentication & Scope ─────────────────────────────────

test('Cashier has canLogin true and can authenticate with password', async () => {
  const passwordHash = await argon2.hash('cashierSecret123')
  const cashierUser = {
    id: 'cashier-1',
    name: 'Main Cashier',
    email: 'cashier@cafe.test',
    passwordHash,
    role: 'cashier',
    branchId: BRANCH_A,
    isActive: true,
    canLogin: true,
    sessionVersion: 1,
  }

  const authService = createAuthService({
    repository: {
      findByEmail: async (email) => (email === 'cashier@cafe.test' ? cashierUser : null),
      findById: async (id) => (id === 'cashier-1' ? cashierUser : null),
    },
    config: { accessSecret: 'test-access-secret-1234567890', refreshSecret: 'test-refresh-secret-1234567890' },
  })

  const result = await authService.authenticate({ email: 'cashier@cafe.test', password: 'cashierSecret123' })
  assert.equal(result.user.role, 'cashier')
  assert.equal(result.user.branchId, BRANCH_A)
  assert.ok(result.accessToken)
})

test('Cashier without canLogin true cannot authenticate', async () => {
  const cashierUser = {
    id: 'cashier-2',
    name: 'Disabled Cashier',
    email: 'cashier2@cafe.test',
    passwordHash: await argon2.hash('pass'),
    role: 'cashier',
    branchId: BRANCH_A,
    isActive: true,
    canLogin: false,
  }

  const authService = createAuthService({
    repository: {
      findByEmail: async () => cashierUser,
      findById: async () => cashierUser,
    },
    config: { accessSecret: 'secret', refreshSecret: 'secret' },
  })

  await assert.rejects(
    async () => authService.authenticate({ email: 'cashier2@cafe.test', password: 'pass' }),
    /Invalid email or password/,
  )
})

// ── Test 2: Cashier Table Number Lookup & Branch Isolation ─────────────────

test('Cashier can lookup active table bill by table number in own branch', async () => {
  const orderList = [{ id: 'ord-1', branchId: BRANCH_A, tableId: TABLE_A, status: 'ready' }]
  const orderItems = [{ id: 'oi-1', orderId: 'ord-1', name: 'Latte', unitPrice: 150, quantity: 2 }]
  const draftBill = {
    id: 'bill-1',
    branchId: BRANCH_A,
    tableId: TABLE_A,
    subtotal: 300,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 300,
    status: 'draft',
    orderIds: ['ord-1'],
  }

  const billingService = createBillingService({
    tables: {
      findTableByNumber: async (branchId, num) => (branchId === BRANCH_A && num === 12 ? { id: TABLE_A, tableNumber: 12, branchId: BRANCH_A } : null),
    },
    bills: {
      listBilledOrderIdsByTable: async () => [],
      findDraftBillByTable: async () => draftBill,
      listBillsByTable: async () => [draftBill],
      updateBill: async (_id, _bId, payload) => ({ ...draftBill, ...payload }),
      createBill: async (payload) => ({ ...payload, id: 'bill-1' }),
    },
    orders: {
      listOrdersReadyForBilling: async () => orderList,
    },
    orderItems: {
      listOrderItems: async () => orderItems,
    },
    settings: {
      findSettingsByBranch: async () => ({ taxRate: 0 }),
    },
  })

  const result = await billingService.getTableBillByNumber(BRANCH_A, 12)
  assert.equal(result.table.tableNumber, 12)
  assert.equal(result.bill.totalAmount, 300)
  assert.equal(result.bill.items.length, 1)
  assert.equal(result.bill.items[0].name, 'Latte')
  assert.equal(result.bill.items[0].quantity, 2)
})

test('Cashier cannot lookup table bill from another branch (branch isolation)', async () => {
  const billingService = createBillingService({
    tables: {
      findTableByNumber: async (branchId, num) => {
        // Table 12 only exists in BRANCH_B
        if (branchId === BRANCH_B && num === 12) return { id: TABLE_B, tableNumber: 12, branchId: BRANCH_B }
        return null
      },
    },
  })

  // Cashier from BRANCH_A queries Table 12
  await assert.rejects(
    async () => billingService.getTableBillByNumber(BRANCH_A, 12),
    /Table 12 not found in this branch/,
  )
})

// ── Test 3: Cash Payment Completion & Table Vacancy ────────────────────────

test('Complete Cash Payment marks bill paid, records method CASH, cashier ID, and clears table', async () => {
  const paymentsCreated = []
  let tableOccupancyCleared = false
  let draftBillsDeleted = false

  const draftBill = {
    id: 'bill-1',
    branchId: BRANCH_A,
    tableId: TABLE_A,
    totalAmount: 450,
    status: 'draft',
    checkoutApprovedAt: null,
  }

  const billingService = createBillingService({
    bills: {
      findBillById: async (id, branchId) => (id === 'bill-1' && branchId === BRANCH_A ? draftBill : null),
      updateBillAttempt: async (_id, _bId, payload) => Object.assign(draftBill, payload),
      finalizeBillWithApproval: async (_id, _bId, approvedAt, cashierId) => {
        draftBill.status = 'finalized'
        draftBill.checkoutApprovedAt = approvedAt
        draftBill.cashierId = cashierId
        return draftBill
      },
      deleteDraftBillsByTable: async () => { draftBillsDeleted = true },
    },
    payments: {
      createPayment: async (payload) => {
        paymentsCreated.push(payload)
        return { id: 'pay-1', ...payload }
      },
    },
    orders: {
      completeTableOrders: async () => [],
      hideTableOrdersFromCustomer: async () => [],
    },
    tables: {
      clearTableOccupancy: async () => { tableOccupancyCleared = true },
    },
  })

  const res = await billingService.completeCashPayment(BRANCH_A, 'bill-1', 'cashier-123')

  // 1. Bill marked finalized / paid
  assert.equal(res.status, 'finalized')
  assert.ok(res.checkoutApprovedAt)

  // 2. Payment method is CASH
  assert.equal(paymentsCreated.length, 1)
  assert.equal(paymentsCreated[0].method, 'cash')
  assert.equal(paymentsCreated[0].amount, 450)

  // 3. Cashier who processed is recorded
  assert.equal(paymentsCreated[0].processedBy, 'cashier-123')
  assert.equal(res.cashierId, 'cashier-123')

  // 4. Table automatically becomes vacant
  assert.equal(tableOccupancyCleared, true)
  assert.equal(draftBillsDeleted, true)
})

// ── Test 4: Inventory Restock Without Supplier ─────────────────────────────

test('createPurchase succeeds without supplierId and increases stock', async () => {
  const sampleIngredient = { id: 'ing-1', branchId: BRANCH_A, name: 'Milk', unit: 'L', stockQuantity: 20 }
  let createdPurchase = null

  const inventoryService = createInventoryService({
    inventory: {
      findIngredientById: async (id, branchId) => (id === 'ing-1' && branchId === BRANCH_A ? sampleIngredient : null),
      createPurchase: async (_branchId, payload) => {
        createdPurchase = payload
        return { id: 'pur-1', ...payload }
      },
    },
  })

  const res = await inventoryService.createPurchase(BRANCH_A, {
    ingredientId: 'ing-1',
    quantity: 20,
    // Note: NO supplierId provided!
  })

  assert.ok(res.id)
  assert.equal(createdPurchase.supplierId, null)
  assert.equal(createdPurchase.quantity, 20)
  assert.equal(createdPurchase.unitCost, 0)
})

// ── Test 5: Idempotent & Transactional Inventory Deduction ─────────────────

test('deductInventoryForOrder deducts recipe quantities inside transaction', async () => {
  const ingredientState = { id: 'ing-milk', name: 'Milk', stock_quantity: '20000.00', unit: 'ml' }
  const deductionsRecorded = []

  // Create a mock PostgreSQL client representing a single transactional connection
  const mockClient = {
    inTransaction: false,
    async query(sql, params = []) {
      const s = sql.trim().toUpperCase()
      if (s === 'BEGIN') {
        this.inTransaction = true
        return { rowCount: 0, rows: [] }
      }
      if (s === 'COMMIT') {
        this.inTransaction = false
        return { rowCount: 0, rows: [] }
      }
      if (s === 'ROLLBACK') {
        this.inTransaction = false
        return { rowCount: 0, rows: [] }
      }
      // Check idempotency table
      if (s.startsWith('SELECT ID FROM ORDER_INVENTORY_DEDUCTIONS')) {
        const found = deductionsRecorded.some((d) => d.order_id === params[0])
        return { rowCount: found ? 1 : 0, rows: found ? [{ id: 'ded-1' }] : [] }
      }
      // Load order items
      if (s.startsWith('SELECT ITEM_ID, QUANTITY FROM ORDER_ITEMS')) {
        return { rowCount: 1, rows: [{ item_id: 'item-latte', quantity: 2 }] }
      }
      // Load recipes: Latte requires 200ml milk
      if (s.startsWith('SELECT INGREDIENT_ID, QUANTITY_USED FROM RECIPES')) {
        return { rowCount: 1, rows: [{ ingredient_id: 'ing-milk', quantity_used: '200.00' }] }
      }
      // Lock ingredient FOR UPDATE
      if (s.startsWith('SELECT ID, NAME, STOCK_QUANTITY, UNIT FROM INGREDIENTS')) {
        return { rowCount: 1, rows: [{ ...ingredientState }] }
      }
      // Deduct stock
      if (s.startsWith('UPDATE INGREDIENTS SET STOCK_QUANTITY')) {
        const deductAmount = params[2]
        ingredientState.stock_quantity = String(Number(ingredientState.stock_quantity) - Number(deductAmount))
        return { rowCount: 1, rows: [] }
      }
      // Record deduction
      if (s.startsWith('INSERT INTO ORDER_INVENTORY_DEDUCTIONS')) {
        deductionsRecorded.push({ order_id: params[0], branch_id: params[1] })
        return { rowCount: 1, rows: [] }
      }
      return { rowCount: 0, rows: [] }
    },
  }

  // Initial stock: 20,000ml. Order: 2 Lattes @ 200ml = 400ml deduction
  const res = await deductInventoryForOrder(BRANCH_A, 'ord-100', { dbClient: mockClient })
  assert.equal(res.success, true)
  assert.equal(res.alreadyDeducted, false)
  assert.equal(ingredientState.stock_quantity, '19600')

  // Repeated completion request: must NOT deduct stock again! (Idempotency)
  const repeatRes = await deductInventoryForOrder(BRANCH_A, 'ord-100', { dbClient: mockClient })
  assert.equal(repeatRes.alreadyDeducted, true)
  assert.equal(ingredientState.stock_quantity, '19600') // unchanged!
})

test('deductInventoryForOrder prevents negative stock and aborts via ROLLBACK', async () => {
  const lowStockIngredient = { id: 'ing-milk', name: 'Milk', stock_quantity: '100.00', unit: 'ml' }
  let rollbackExecuted = false

  const mockClient = {
    async query(sql, params = []) {
      const s = sql.trim().toUpperCase()
      if (s === 'BEGIN') return { rowCount: 0, rows: [] }
      if (s === 'ROLLBACK') {
        rollbackExecuted = true
        return { rowCount: 0, rows: [] }
      }
      if (s.startsWith('SELECT ID FROM ORDER_INVENTORY_DEDUCTIONS')) {
        return { rowCount: 0, rows: [] }
      }
      if (s.startsWith('SELECT ITEM_ID, QUANTITY FROM ORDER_ITEMS')) {
        return { rowCount: 1, rows: [{ item_id: 'item-latte', quantity: 1 }] }
      }
      if (s.startsWith('SELECT INGREDIENT_ID, QUANTITY_USED FROM RECIPES')) {
        // Latte requires 200ml milk, but available is only 100ml
        return { rowCount: 1, rows: [{ ingredient_id: 'ing-milk', quantity_used: '200.00' }] }
      }
      if (s.startsWith('SELECT ID, NAME, STOCK_QUANTITY, UNIT FROM INGREDIENTS')) {
        return { rowCount: 1, rows: [{ ...lowStockIngredient }] }
      }
      if (s.startsWith('UPDATE INGREDIENTS')) {
        throw new Error('Should NOT update when stock is insufficient!')
      }
      return { rowCount: 0, rows: [] }
    },
  }

  await assert.rejects(
    async () => deductInventoryForOrder(BRANCH_A, 'ord-200', { dbClient: mockClient }),
    /Insufficient stock for "Milk"/,
  )
  assert.equal(rollbackExecuted, true)
  assert.equal(lowStockIngredient.stock_quantity, '100.00') // Stock untouched, not negative!
})
