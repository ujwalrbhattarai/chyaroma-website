import * as tableRepository from '../repositories/tableRepository.js'
import { cancelOrder, getPublicMenu, getTableStatus, placeOrder } from '../services/orderService.js'
import { enforceDeviceTabLock } from '../services/transferService.js'

async function findTableOrThrow(token) {
  const table = await tableRepository.findTableByToken(token)
  if (!table) throw Object.assign(new Error('Invalid table token'), { statusCode: 403 })
  return table
}

function deviceIdFrom(request) {
  const value = request.headers['x-device-id']
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 64) : null
}

// Block a customer from opening/ordering on a different table while they still have an
// open (unpaid) tab elsewhere, and raise a staff approval request for the move.
async function assertTableEntryAllowed(request, table) {
  const deviceId = deviceIdFrom(request)
  if (!deviceId) return
  const gate = await enforceDeviceTabLock({ deviceId, targetTableId: table.id, branchId: table.branchId })
  if (!gate.allowed) {
    const error = Object.assign(new Error('This device has an open bill on another table. Staff must approve the table change.'), { statusCode: 409, transfer: gate.transfer ?? null })
    throw error
  }
}

export async function getPublicMenuHandler(request, response, next) {
  try {
    const tableToken = request.query.token ?? request.body.token
    const table = await findTableOrThrow(tableToken)
    await assertTableEntryAllowed(request, table)
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
    await assertTableEntryAllowed(request, table)
    const order = await placeOrder({ branchId: table.branchId, tableToken, notes: request.body.notes, items: request.body.items, deviceId: deviceIdFrom(request) })
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
