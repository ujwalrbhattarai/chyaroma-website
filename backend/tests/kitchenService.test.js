import assert from 'node:assert/strict'
import test from 'node:test'
import { createKitchenService } from '../services/kitchenService.js'

const BRANCH = 'branch-1'
const sampleOrder = { id: 'ord-1', branchId: BRANCH, tableId: 'tbl-1', status: 'pending', createdAt: new Date().toISOString() }

const makeService = (orders = [sampleOrder], tables = [], itemStore = []) => {
  const orderStore = orders.map((o) => ({ ...o }))
  const tableStore = tables.map((t) => ({ ...t }))
  return createKitchenService({
    orders: {
      listOpenOrdersByBranch: async (branchId) => orderStore.filter((o) => o.branchId === branchId),
      findOrderById:          async (id, branchId) => orderStore.find((o) => o.id === id && o.branchId === branchId) ?? null,
      updateOrderStatus:      async (id, branchId, status, fields = {}) => {
        const order = orderStore.find((o) => o.id === id)
        Object.assign(order, { status, ...fields })
        return order
      },
    },
    orderItems: { listOrderItems: async (orderId, branchId) => itemStore.filter((i) => i.orderId === orderId) },
    recipes:    { findRecipesByItem: async () => [] },
    inventory:  { findIngredientById: async () => null, updateIngredientStock: async () => null },
    tables: {
      listTables: async (branchId) => tableStore.filter((t) => t.branchId === branchId),
    },
  })
}

test('listQueue returns open orders for branch', async () => {
  const service = makeService()
  const result = await service.listQueue(BRANCH)
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'ord-1')
})

test('transitionOrder advances pending → accepted', async () => {
  const service = makeService()
  const order = await service.transitionOrder(BRANCH, 'ord-1', 'accepted', 'kitchen_staff')
  assert.equal(order.status, 'accepted')
  assert.ok(order.cancellationLockedAt, 'should lock cancellation on accept')
})

test('transitionOrder rejects skipping steps (pending → ready)', async () => {
  const service = makeService()
  await assert.rejects(async () => service.transitionOrder(BRANCH, 'ord-1', 'ready', 'kitchen_staff'), /Invalid order transition/)
})

test('transitionOrder throws 404 for unknown order', async () => {
  const service = makeService()
  await assert.rejects(async () => service.transitionOrder(BRANCH, 'ghost-id', 'accepted', 'kitchen_staff'), /not found/i)
})

test('listQueue returns empty array when no open orders', async () => {
  const service = makeService([])
  const result = await service.listQueue(BRANCH)
  assert.equal(result.length, 0)
})

test('listQueue attaches tableNumber from tables list', async () => {
  const service = makeService(
    [{ id: 'ord-1', branchId: BRANCH, tableId: 'tbl-1', status: 'pending', createdAt: new Date().toISOString() }],
    [{ id: 'tbl-1', branchId: BRANCH, tableNumber: 5 }],
  )
  const result = await service.listQueue(BRANCH)
  assert.equal(result[0].tableNumber, 5)
})

test('listQueue includes the order items so kitchen sees what was ordered', async () => {
  const service = makeService(
    [{ id: 'ord-1', branchId: BRANCH, tableId: 'tbl-1', status: 'pending', createdAt: new Date().toISOString() }],
    [],
    [{ id: 'oi-1', orderId: 'ord-1', name: 'Caramel Cappuccino', quantity: 2, unitPrice: 220 }],
  )
  const result = await service.listQueue(BRANCH)
  assert.equal(result[0].items.length, 1)
  assert.equal(result[0].items[0].name, 'Caramel Cappuccino')
  assert.equal(result[0].items[0].quantity, 2)
})
