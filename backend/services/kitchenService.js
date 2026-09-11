import { EventEmitter } from 'node:events'
import * as orderRepository from '../repositories/orderRepository.js'
import * as orderItemRepository from '../repositories/orderItemRepository.js'
import * as recipeRepository from '../repositories/recipeRepository.js'
import * as inventoryRepository from '../repositories/inventoryRepository.js'
import * as tableRepository from '../repositories/tableRepository.js'
import { deductInventoryForOrder } from './inventoryDeduction.js'

const kitchenEvents = new EventEmitter()
const kitchenError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

export function getKitchenEvents() { return kitchenEvents }

export function createKitchenService({ orders = orderRepository, orderItems = orderItemRepository, recipes = recipeRepository, inventory = inventoryRepository, tables = tableRepository, events = kitchenEvents } = {}) {
  return {
    events,
    async listQueue(branchId) {
      const queue = await orders.listOpenOrdersByBranch(branchId)
      const tableList = await tables.listTables(branchId)
      const tableMap = new Map(tableList.map((t) => [t.id, t.tableNumber]))
      const result = []
      for (const order of queue) {
        const items = await orderItems.listOrderItems(order.id, branchId)
        result.push({ ...order, tableNumber: tableMap.get(order.tableId) ?? null, items })
      }
      return result
    },
    async transitionOrder(branchId, orderId, nextStatus, actorRole) {
      const order = await orders.findOrderById(orderId, branchId)
      if (!order) throw kitchenError('Order not found', 404)
      const allowed = new Map([
        ['accepted', ['pending']],
        ['preparing', ['accepted']],
        ['ready', ['preparing']],
        ['completed', ['ready', 'preparing']],
      ])
      if (!allowed.get(nextStatus)?.includes(order.status)) throw kitchenError('Invalid order transition')
      const timestamps = {
        accepted: { acceptedAt: new Date().toISOString(), cancellationLockedAt: new Date().toISOString() },
        preparing: { preparingAt: new Date().toISOString() },
        ready: { readyAt: new Date().toISOString() },
        completed: { completedAt: new Date().toISOString() },
      }
      const updated = await orders.updateOrderStatus(orderId, branchId, nextStatus, timestamps[nextStatus])
      // Deduct inventory when the order is delivered (completed), so stock reflects
      // what has actually left the kitchen. Fires exactly once per order.
      if (nextStatus === 'completed') await deductInventoryForOrder(branchId, orderId, { orderItems, recipes, inventory })
      events.emit('order-updated', { branchId, order: updated })
      return updated
    },
  }
}

const service = createKitchenService()
export const listQueue = (...args) => service.listQueue(...args)
export const transitionOrder = (...args) => service.transitionOrder(...args)
export { kitchenEvents }
