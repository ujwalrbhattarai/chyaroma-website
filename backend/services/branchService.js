import * as branchRepository from '../repositories/branchRepository.js'

const branchError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

export function assertSuperAdmin(user) {
  if (!user || user.role !== 'super_admin') throw branchError('Forbidden', 403)
}

function normalizeBranchInput(payload = {}) {
  const name = payload.name?.trim()
  const address = payload.address?.trim()
  const contactPhone = payload.contactPhone?.trim()
  const contactEmail = payload.contactEmail?.trim().toLowerCase()
  const taxRate = Number(payload.taxRate)
  const openingHours = payload.openingHours?.trim()

  if (!name || !address || !contactPhone || !contactEmail || !openingHours) {
    throw branchError('All branch fields are required')
  }

  if (!Number.isFinite(taxRate) || taxRate < 0) {
    throw branchError('taxRate must be a non-negative number')
  }

  if (name.toLowerCase() === 'demo branch') {
    throw branchError('The name "Demo Branch" is reserved for the system environment.')
  }

  return { name, address, contactPhone, contactEmail, taxRate, openingHours }
}

export function createBranchService({ repository = branchRepository } = {}) {
  return {
    listBranches(user) {
      assertSuperAdmin(user)
      return repository.listBranches()
    },
    createBranch(user, payload) {
      assertSuperAdmin(user)
      return repository.createBranch(normalizeBranchInput(payload))
    },
    async updateBranch(user, id, payload) {
      assertSuperAdmin(user)
      const existing = await repository.findBranchById(id)
      if (!existing) throw branchError('Branch not found', 404)
      if (existing.isDemo) throw branchError('The Demo Branch is a system branch and cannot be modified.', 403)
      const normalized = normalizeBranchInput({ ...existing, ...payload })
      return repository.updateBranch(id, { ...normalized, isActive: payload.isActive ?? existing.isActive })
    },
    async deactivateBranch(user, id) {
      assertSuperAdmin(user)
      const existing = await repository.findBranchById(id)
      if (!existing) throw branchError('Branch not found', 404)
      if (existing.isDemo) throw branchError('The Demo Branch is a system branch and cannot be deactivated.', 403)
      return repository.deactivateBranch(id)
    },
  }
}

const service = createBranchService()

export const listBranches = (...args) => service.listBranches(...args)
export const createBranch = (...args) => service.createBranch(...args)
export const updateBranch = (...args) => service.updateBranch(...args)
export const deactivateBranch = (...args) => service.deactivateBranch(...args)
