import { EventEmitter } from 'node:events'
import * as deviceRepository from '../repositories/deviceRepository.js'

const transferEvents = new EventEmitter()

const transferError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

// Gate a device trying to open/order on `targetTableId`. If the same device already has
// an open (unpaid) tab on a DIFFERENT table, block it and raise a staff approval request.
export async function enforceDeviceTabLock({ deviceId, targetTableId, branchId }) {
  if (!deviceId) return { allowed: true }
  const activeTables = await deviceRepository.getDeviceActiveTables(deviceId)
  const conflicting = activeTables.find((tableId) => tableId !== targetTableId)
  if (!conflicting) return { allowed: true }
  const existing = await deviceRepository.findPendingByDeviceAndTarget(deviceId, targetTableId)
  if (existing) return { allowed: false, transfer: existing }
  const created = await deviceRepository.createPendingTransfer({ deviceId, branchId, fromTableId: conflicting, toTableId: targetTableId })
  const transfer = await deviceRepository.getTransferRequest(created.id)
  transferEvents.emit('transfer-requested', { branchId, transfer })
  return { allowed: false, transfer }
}

export async function listPendingTransfers(branchId) {
  return deviceRepository.listPendingTransfers(branchId)
}

export async function approveTransfer(branchId, requestId, resolvedBy) {
  const request = await deviceRepository.getTransferRequest(requestId)
  if (!request || request.branchId !== branchId) throw transferError('Transfer request not found', 404)
  if (request.status !== 'pending') throw transferError('Transfer request already resolved', 409)
  await deviceRepository.transferTab(branchId, request.deviceId, request.fromTableId, request.toTableId)
  const updated = await deviceRepository.resolveTransferRequest(requestId, 'approved', resolvedBy)
  transferEvents.emit('transfer-resolved', { branchId, transfer: updated })
  return updated
}

export async function denyTransfer(branchId, requestId, resolvedBy) {
  const request = await deviceRepository.getTransferRequest(requestId)
  if (!request || request.branchId !== branchId) throw transferError('Transfer request not found', 404)
  if (request.status !== 'pending') throw transferError('Transfer request already resolved', 409)
  const updated = await deviceRepository.resolveTransferRequest(requestId, 'denied', resolvedBy)
  transferEvents.emit('transfer-resolved', { branchId, transfer: updated })
  return updated
}

export { transferEvents }