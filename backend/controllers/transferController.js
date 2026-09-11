import { approveTransfer, denyTransfer, listPendingTransfers } from '../services/transferService.js'

function resolveBranchId(request) {
  return request.user.role === 'super_admin' ? (request.query.branchId || request.user.branchId) : request.user.branchId
}

export async function listPendingTransfersHandler(request, response, next) {
  try {
    response.status(200).json({ transfers: await listPendingTransfers(resolveBranchId(request)) })
  } catch (error) { next(error) }
}

export async function approveTransferHandler(request, response, next) {
  try {
    response.status(200).json({ transfer: await approveTransfer(resolveBranchId(request), request.params.id, request.user.id) })
  } catch (error) { next(error) }
}

export async function denyTransferHandler(request, response, next) {
  try {
    response.status(200).json({ transfer: await denyTransfer(resolveBranchId(request), request.params.id, request.user.id) })
  } catch (error) { next(error) }
}