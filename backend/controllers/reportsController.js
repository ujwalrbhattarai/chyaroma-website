import { overview, report } from '../services/reportsService.js'

function resolveBranchId(request) {
  // Super admin may pass a branchId; otherwise falls back to their own (manager) or null (all).
  return request.query.branchId ?? request.user.branchId
}

export async function getOverviewHandler(request, response, next) {
  try { response.status(200).json({ overview: await overview(resolveBranchId(request)) }) } catch (error) { next(error) }
}

export async function getReportHandler(request, response, next) {
  try {
    const branchId = resolveBranchId(request)
    const data = await report(branchId, { from: request.query.from, to: request.query.to })
    response.status(200).json(data)
  } catch (error) { next(error) }
}
