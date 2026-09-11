import { kitchenEvents, listQueue, transitionOrder } from '../services/kitchenService.js'

function resolveBranchId(request) {
  return request.query?.branchId ?? request.body?.branchId ?? request.user?.branchId
}

export async function getKitchenQueueHandler(request, response, next) {
  try {
    response.status(200).json({ orders: await listQueue(resolveBranchId(request)) })
  } catch (error) {
    next(error)
  }
}

export async function transitionKitchenOrderHandler(request, response, next) {
  try {
    const branchId = resolveBranchId(request)
    const nextStatus = request.body.status ?? request.body.nextStatus
    const updated = await transitionOrder(branchId, request.params.orderId, nextStatus, request.user.role)
    response.status(200).json({ order: updated })
  } catch (error) {
    next(error)
  }
}

export { kitchenEvents }
