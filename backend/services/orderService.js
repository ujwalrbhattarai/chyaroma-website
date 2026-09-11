import * as menuRepository from '../repositories/menuRepository.js'
import * as orderRepository from '../repositories/orderRepository.js'
import * as orderItemRepository from '../repositories/orderItemRepository.js'
import * as tableRepository from '../repositories/tableRepository.js'

const orderError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

const MAX_QUANTITY_PER_LINE = 99
const MAX_LINE_ITEMS = 100
const MAX_ORDER_QUANTITY = 500
const MAX_NOTES_LENGTH = 500

function normalizeOrderItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) throw orderError('At least one item is required')
  if (items.length > MAX_LINE_ITEMS) throw orderError(`A single order cannot hold more than ${MAX_LINE_ITEMS} line items`)
  const normalized = items.map((item) => {
    const itemId = typeof item.itemId === 'string' ? item.itemId.trim() : item.itemId
    const quantity = Number(item.quantity)
    if (!itemId) throw orderError('Each order item requires an itemId')
    // Server-authoritative guard: never accept zero, negative, fractional, or absurd
    // quantities. A hostile payload like quantity: -100 previously produced a negative
    // (or free) bill, which a scammer could use against the cashier.
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      throw orderError(`Quantity must be a whole number between 1 and ${MAX_QUANTITY_PER_LINE}`)
    }
    return {
      itemId,
      quantity,
      notes: (item.notes ?? '').toString().slice(0, MAX_NOTES_LENGTH),
    }
  })
  const totalQuantity = normalized.reduce((sum, entry) => sum + entry.quantity, 0)
  if (totalQuantity > MAX_ORDER_QUANTITY) throw orderError(`An order cannot exceed ${MAX_ORDER_QUANTITY} items total`)
  return normalized
}

export function createOrderService({ orders = orderRepository, orderItems = orderItemRepository, menus = menuRepository, tables = tableRepository } = {}) {
  return {
    async getPublicMenu(tableToken) {
      const table = await tables.findTableByToken(tableToken)
      if (!table || !table.isActive) throw orderError('Invalid table token', 403)
      // Auto-occupy: scanning the QR marks this table occupied immediately.
      if (tables.setCustomerOccupied) {
        await tables.setCustomerOccupied(table.id, table.branchId, true)
      }
      return { table, menu: await menus.listMenuItems(table.branchId), categories: await menus.listCategories(table.branchId) }
    },
    async placeOrder({ branchId, tableToken, notes, items, deviceId }) {
      if (!branchId || !tableToken) throw orderError('branchId and table token are required')
      const table = await tables.findTableByToken(tableToken)
      if (!table || !table.isActive || table.branchId !== branchId) throw orderError('Invalid table token', 403)
      const tableItems = normalizeOrderItems(items)
      // Resolve every item against the menu BEFORE creating any order row, so an invalid
      // or tampered payload cannot leave behind an orphaned/empty pending order to abuse.
      const resolved = []
      for (const entry of tableItems) {
        const menuItem = await menus.findMenuItemById(entry.itemId, branchId)
        if (!menuItem || !menuItem.isAvailable) throw orderError('Menu item unavailable', 400)
        resolved.push({ entry, menuItem })
      }
      const order = await orders.createOrder({ branchId, tableId: table.id, notes, deviceId })
      const createdItems = []
      for (const { entry, menuItem } of resolved) {
        createdItems.push(await orderItems.createOrderItem({ orderId: order.id, branchId, itemId: menuItem.id, name: menuItem.name, unitPrice: menuItem.price, quantity: entry.quantity, notes: entry.notes }))
      }
      return { order, items: createdItems, canCancelUntil: new Date(Date.now() + 2 * 60 * 1000).toISOString() }
    },
    async getTableStatus(branchId, tableToken) {
      const table = await tables.findTableByToken(tableToken)
      if (!table || table.branchId !== branchId) throw orderError('Invalid table token', 403)
      // Include completed orders (and their items) so the customer can review everything they ordered/consumed.
      const visibleOrders = await orders.listCustomerVisibleOrdersByTable(branchId, table.id)
      const items = []
      for (const order of visibleOrders) items.push(...await orderItems.listOrderItems(order.id, branchId))
      return { table, orders: visibleOrders, items }
    },
    async cancelOrder(branchId, tableToken, orderId) {
      const table = await tables.findTableByToken(tableToken)
      if (!table || table.branchId !== branchId) throw orderError('Invalid table token', 403)
      const order = await orders.findOrderById(orderId, branchId)
      if (!order || order.tableId !== table.id) throw orderError('Order not found', 404)
      if (order.status !== 'pending') throw orderError('Only pending orders can be cancelled', 400)
      const lockDeadline = new Date(new Date(order.createdAt).getTime() + 2 * 60 * 1000)
      if (new Date() > lockDeadline || order.cancellationLockedAt) throw orderError('Cancellation window closed', 400)
      return orders.updateOrderStatus(orderId, branchId, 'cancelled', { cancelledAt: new Date().toISOString() })
    },
  }
}

const service = createOrderService()
export const getPublicMenu = (...args) => service.getPublicMenu(...args)
export const placeOrder = (...args) => service.placeOrder(...args)
export const getTableStatus = (...args) => service.getTableStatus(...args)
export const cancelOrder = (...args) => service.cancelOrder(...args)