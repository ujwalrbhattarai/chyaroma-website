import { createBranch, deactivateBranch, listBranches, updateBranch } from '../services/branchService.js'

export async function getBranches(request, response, next) {
  try {
    response.status(200).json({ branches: await listBranches(request.user) })
  } catch (error) {
    next(error)
  }
}

export async function createBranchHandler(request, response, next) {
  try {
    response.status(201).json({ branch: await createBranch(request.user, request.body) })
  } catch (error) {
    next(error)
  }
}

export async function updateBranchHandler(request, response, next) {
  try {
    response.status(200).json({ branch: await updateBranch(request.user, request.params.branchId, request.body) })
  } catch (error) {
    next(error)
  }
}

export async function deactivateBranchHandler(request, response, next) {
  try {
    response.status(200).json({ branch: await deactivateBranch(request.user, request.params.branchId) })
  } catch (error) {
    next(error)
  }
}
