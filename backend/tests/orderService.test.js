import assert from 'node:assert/strict'
import test from 'node:test'
import { createOrderService } from '../services/orderService.js'

const sampleTable = { id: 'table-1', branchId: 'branch-1', tableNumber: 3, qrToken: 'tok-1', isActive: true }
const sampleMenuItem = { id: 'item-1', branchId: 'branch-1', categoryId: 'cat-1', name: 'Coffee', price: 150, isAvailable: true }
const sampleCategory = { id: 'cat-1', branchId: 'branch-1', name: 'Drinks' }

const makeService = ({ tables = [sampleTable], menuItems = [sampleMenuItem], categories = [sampleCategory], orders = [] } = {}) => {
  const orderStore = [...orders]
  const itemStore = []
  return createOrderService({
    tables: {
      findTableByToken: async (token) => tables.find((t) => t.qrToken === token) ?? null,
    },
    menus: {
      listMenuItems: async (branchId) => menuItems.filter((i) => i.branchId === branchId && i.isAvailable),
      listCategories: async (branchId) => categories.filter((c) => c.branchId === branchId),
      findMenuItemById: async (id, branchId) => menuItems.find((i) => i.id === id && i.branchId === branchId && i.isAvailable) ?? null,
    },
    orders: {
      createOrder: async (payload) => {
        const o = { ...payload, id: `ord-${Date.now()}`, status: 'pending', cancellationLockedAt: null, createdAt: new Date().toISOString() }
        orderStore.push(o)
        return o
      },
      findOrderById: async (id, branchId) => orderStore.find((o) => o.id === id && o.branchId === branchId) ?? null,
      listOrdersByTable: async (branchId, tableId) => orderStore.filter((o) => o.branchId === branchId && o.tableId === tableId),
      listActiveOrdersByTable: async (branchId, tableId) => orderStore.filter((o) => o.branchId === branchId && o.tableId === tableId && !['cancelled', 'completed'].includes(o.status)),
      listCustomerVisibleOrdersByTable: async (branchId, tableId) => orderStore.filter((o) => o.branchId === branchId && o.tableId === tableId && o.status !== 'cancelled' && o.customerVisible !== false),
      updateOrderStatus: async (id, branchId, status, fields = {}) => {
        const order = orderStore.find((o) => o.id === id && o.branchId === branchId)
        Object.assign(order, { status, ...fields })
        return order
      },
    },
    orderItems: {
      createOrderItem: async (payload) => { const item = { ...payload, id: `oi-${Date.now()}` }; itemStore.push(item); return item },
      listOrderItems: async (orderId) => itemStore.filter((i) => i.orderId === orderId),
    },
  })
}

test('getPublicMenu returns available items for valid token', async () => {
  const service = makeService()
  const result = await service.getPublicMenu('tok-1')
  assert.equal(result.table.tableNumber, 3)
  assert.equal(result.menu.length, 1)
  assert.equal(result.menu[0].name, 'Coffee')
})

test('getPublicMenu rejects invalid token', async () => {
  const service = makeService()
  await assert.rejects(async () => service.getPublicMenu('bad-token'), /Invalid table token/)
})

test('placeOrder creates order and returns cancellation window', async () => {
  const service = makeService()
  const result = await service.placeOrder({ branchId: 'branch-1', tableToken: 'tok-1', items: [{ itemId: 'item-1', quantity: 2 }], notes: 'extra hot' })
  assert.ok(result.order?.id)
  assert.ok(result.canCancelUntil)
  assert.ok(new Date(result.canCancelUntil) > new Date())
})

test('placeOrder rejects unavailable items', async () => {
  const noMenu = makeService({ menuItems: [] })
  await assert.rejects(
    async () => noMenu.placeOrder({ branchId: 'branch-1', tableToken: 'tok-1', items: [{ itemId: 'item-1', quantity: 1 }] }),
    /unavailable/i,
  )
})

test('placeOrder rejects empty cart', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.placeOrder({ branchId: 'branch-1', tableToken: 'tok-1', items: [] }),
    /at least one item/i,
  )
})

test('cancelOrder succeeds within the 2-minute window', async () => {
  const service = makeService()
  const placed = await service.placeOrder({ branchId: 'branch-1', tableToken: 'tok-1', items: [{ itemId: 'item-1', quantity: 1 }] })
  const result = await service.cancelOrder('branch-1', 'tok-1', placed.order.id)
  assert.equal(result.status, 'cancelled')
})

test('getTableStatus returns all non-cancelled orders including completed ones', async () => {
  const service = makeService({
    orders: [
      { id: 'ord-1', branchId: 'branch-1', tableId: 'table-1', status: 'completed', cancellationLockedAt: null, createdAt: new Date().toISOString() },
      { id: 'ord-2', branchId: 'branch-1', tableId: 'table-1', status: 'pending', cancellationLockedAt: null, createdAt: new Date().toISOString() },
    ],
  })
  const result = await service.getTableStatus('branch-1', 'tok-1')
  // Both completed and pending orders are visible to the customer
  assert.equal(result.orders.length, 2)
  assert.equal(result.orders.find((o) => o.status === 'completed').id, 'ord-1')
  assert.equal(result.orders.find((o) => o.status === 'pending').id, 'ord-2')
})
