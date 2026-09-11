import * as tableRepository from '../repositories/tableRepository.js'
import { cancelOrder, getPublicMenu, getTableStatus, placeOrder } from '../services/orderService.js'

async function findTableOrThrow(token) {
  const table = await tableRepository.findTableByToken(token)
  if (!table) throw Object.assign(new Error('Invalid table token'), { statusCode: 403 })
  return table
}

export async function getPublicMenuHandler(request, response, next) {
  try {
    const tableToken = request.query.token ?? request.body.token
    const menu = await getPublicMenu(tableToken)
    response.status(200).json(menu)
  } catch (error) {
    next(error)
  }
}

export async function placeOrderHandler(request, response, next) {
  try {
    const tableToken = request.body.token
    const table = await findTableOrThrow(tableToken)
    const order = await placeOrder({ branchId: table.branchId, tableToken, notes: request.body.notes, items: request.body.items })
    response.status(201).json(order)
  } catch (error) {
    next(error)
  }
}

export async function getOrderStatusHandler(request, response, next) {
  try {
    const tableToken = request.query.token ?? request.body.token
    const table = await findTableOrThrow(tableToken)
    response.status(200).json(await getTableStatus(table.branchId, tableToken))
  } catch (error) {
    next(error)
  }
}

export async function cancelOrderHandler(request, response, next) {
  try {
    const tableToken = request.body.token
    const table = await findTableOrThrow(tableToken)
    response.status(200).json(await cancelOrder(table.branchId, tableToken, request.body.orderId))
  } catch (error) {
    next(error)
  }
}
