import * as menuRepository from '../repositories/menuRepository.js'
import * as orderRepository from '../repositories/orderRepository.js'
import * as orderItemRepository from '../repositories/orderItemRepository.js'
import * as tableRepository from '../repositories/tableRepository.js'

const orderError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

function normalizeOrderItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) throw orderError('At least one item is required')
  return items.map((item) => ({ itemId: item.itemId, quantity: Number(item.quantity), notes: item.notes ?? '' }))
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
    async placeOrder({ branchId, tableToken, notes, items }) {
      if (!branchId || !tableToken) throw orderError('branchId and table token are required')
      const table = await tables.findTableByToken(tableToken)
      if (!table || !table.isActive || table.branchId !== branchId) throw orderError('Invalid table token', 403)
      const tableItems = normalizeOrderItems(items)
      const order = await orders.createOrder({ branchId, tableId: table.id, notes })
      const createdItems = []
      for (const item of tableItems) {
        const menuItem = await menus.findMenuItemById(item.itemId, branchId)
        if (!menuItem || !menuItem.isAvailable) throw orderError('Menu item unavailable', 400)
        createdItems.push(await orderItems.createOrderItem({ orderId: order.id, branchId, itemId: menuItem.id, name: menuItem.name, unitPrice: menuItem.price, quantity: item.quantity, notes: item.notes }))
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