import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'
import * as tableRepository from '../repositories/tableRepository.js'
import * as orderRepository from '../repositories/orderRepository.js'
import * as billRepository from '../repositories/billRepository.js'

const tableError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const tokenSecret = process.env.QR_TABLE_SECRET ?? process.env.JWT_ACCESS_SECRET

export function assertTableAccess(user) {
  if (!user || !['super_admin', 'branch_manager'].includes(user.role)) throw tableError('Forbidden', 403)
}

export function assertTableReadAccess(user) {
  if (!user || !['super_admin', 'branch_manager', 'kitchen_staff'].includes(user.role)) throw tableError('Forbidden', 403)
}

function resolveBranchId(user, requestedBranchId) {
  return user.role === 'super_admin' ? requestedBranchId : user.branchId
}

function signTableToken({ branchId, tableId, tableNumber }) {
  if (!tokenSecret) throw tableError('QR_TABLE_SECRET or JWT_ACCESS_SECRET is required', 500)
  return jwt.sign({ type: 'table', branchId, tableId, tableNumber }, tokenSecret, { expiresIn: '5y' })
}

function buildMenuUrl(token) {
  const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
  return `${origin}/table/menu?token=${encodeURIComponent(token)}`
}

export function createTableService({ repository = tableRepository, orders = orderRepository, bills = billRepository, secret = tokenSecret } = {}) {
  function signToken({ branchId, tableId, tableNumber }) {
    if (!secret) throw tableError('QR_TABLE_SECRET or JWT_ACCESS_SECRET is required', 500)
    return jwt.sign({ type: 'table', branchId, tableId, tableNumber }, secret, { expiresIn: '5y' })
  }
  return {
    async listTables(user, requestedBranchId) {
      assertTableReadAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw tableError('branchId is required', 400)
      return repository.listTablesWithOccupancy(branchId)
    },
    async createTable(user, requestedBranchId, payload) {
      assertTableAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw tableError('branchId is required', 400)
      const tableNumber = Number(payload.tableNumber)
      const label = payload.label?.trim() ?? ''
      if (!Number.isInteger(tableNumber) || tableNumber < 1) throw tableError('tableNumber must be a positive integer')
      const existing = await repository.listTables(branchId)
      if (existing.some((t) => t.tableNumber === tableNumber)) throw tableError('Table number already exists in this branch')
      const temporaryToken = signToken({ branchId, tableId: `pending-${branchId}-${tableNumber}`, tableNumber })
      const pendingTable = await repository.createTable(branchId, { tableNumber, label, qrToken: temporaryToken })
      const finalToken = signToken({ branchId, tableId: pendingTable.id, tableNumber })
      return repository.updateTableToken(pendingTable.id, branchId, finalToken)
    },
    async deactivateTable(user, requestedBranchId, tableId) {
      assertTableAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw tableError('branchId is required', 400)
      const table = await repository.findTableById(tableId, branchId)
      if (!table) throw tableError('Table not found', 404)
      return repository.deactivateTable(tableId, branchId)
    },
    async setTableOccupied(user, requestedBranchId, tableId, occupied) {
      assertTableAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw tableError('branchId is required', 400)
      const table = await repository.findTableById(tableId, branchId)
      if (!table) throw tableError('Table not found', 404)
      if (occupied) {
        return repository.setManualOccupied(tableId, branchId, true)
      }
      // Manager trying to mark a table vacant — only allowed when there is nothing
      // unpaid on it. Otherwise they must use the force-release flow.
      const activity = await repository.getTableUnpaidActivity(branchId, tableId)
      if (activity.hasUnpaidActivity) {
        throw tableError('This table has unpaid orders or an outstanding bill. Pay the bill first or use force-release.', 409)
      }
      await repository.setCustomerOccupied(tableId, branchId, false)
      return repository.setManualOccupied(tableId, branchId, false)
    },
    async validateScanToken(token) {
      if (!token) throw tableError('Token is required')
      if (!secret) throw tableError('QR_TABLE_SECRET or JWT_ACCESS_SECRET is required', 500)
      let payload
      try { payload = jwt.verify(token, secret) } catch { throw tableError('Invalid table token') }
      if (payload.type !== 'table') throw tableError('Invalid table token')
      const table = await repository.findTableById(payload.tableId, payload.branchId)
      if (!table || !table.isActive || table.qrToken !== token) throw tableError('Invalid table token')
      // Auto-occupy: scanning the QR marks this table occupied until the customer
      // pays the bill (or staff force-releases it).
      const updated = await repository.setCustomerOccupied(table.id, table.branchId, true)
      return { table: updated }
    },
    async releaseTable(token) {
      if (!token) throw tableError('Token is required')
      const table = await repository.findTableByToken(token)
      if (!table || !table.isActive) throw tableError('Invalid table token', 403)
      // A customer may only release/vacate a table when they have no unpaid
      // activity — i.e. they have not ordered/eaten anything that still needs paying.
      const activity = await repository.getTableUnpaidActivity(table.branchId, table.id)
      if (activity.hasUnpaidActivity) {
        throw tableError('This table has unpaid orders or an outstanding bill. Please pay the bill before leaving.', 409)
      }
      await repository.setCustomerOccupied(table.id, table.branchId, false)
      return { released: true, table: { ...table, customerOccupied: false } }
    },
    async forceReleaseTable(user, requestedBranchId, tableId) {
      assertTableAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw tableError('branchId is required', 400)
      const table = await repository.findTableById(tableId, branchId)
      if (!table) throw tableError('Table not found', 404)
      await orders.cancelPendingOrdersByTable(branchId, tableId)
      await bills.deleteDraftBillsByTable(branchId, tableId)
      await repository.setCustomerOccupied(tableId, branchId, false)
      return repository.setManualOccupied(tableId, branchId, false)
    },
    async generateQrCode(token) {
      const url = buildMenuUrl(token)
      return QRCode.toDataURL(url, { width: 300, margin: 2 })
    },
  }
}

const service = createTableService()
export const listTables = (...args) => service.listTables(...args)
export const createTable = (...args) => service.createTable(...args)
export const deactivateTable = (...args) => service.deactivateTable(...args)
export const setTableOccupied = (...args) => service.setTableOccupied(...args)
export const validateScanToken = (...args) => service.validateScanToken(...args)
export const releaseTable = (...args) => service.releaseTable(...args)
export const forceReleaseTable = (...args) => service.forceReleaseTable(...args)
export const generateQrCode = (...args) => service.generateQrCode(...args)