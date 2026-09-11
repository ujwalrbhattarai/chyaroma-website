import argon2 from 'argon2'
import * as defaultSuperAdminRepository from '../repositories/superAdminRepository.js'

const serviceError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

function normalizeEmail(email) {
  return email?.trim().toLowerCase()
}

function assertSuperAdminCaller(user) {
  if (!user || user.role !== 'super_admin') {
    throw serviceError('Forbidden: Super Admin access required', 403)
  }
}

export function createSuperAdminService(deps = {}) {
  const superAdminRepository = deps.repository || defaultSuperAdminRepository

  return {
    async listSuperAdmins(callerUser) {
      assertSuperAdminCaller(callerUser)
      return superAdminRepository.listSuperAdmins()
    },

    async createSuperAdmin(callerUser, payload) {
      assertSuperAdminCaller(callerUser)

      const name = payload.name?.trim()
      const email = normalizeEmail(payload.email)
      const password = payload.password

      if (!name) throw serviceError('Full name is required')
      if (!email) throw serviceError('Email address is required')
      if (!password) throw serviceError('Password is required')
      if (password.length < 8) throw serviceError('Password must be at least 8 characters')

      if (await superAdminRepository.emailExists(email)) {
        throw serviceError('A user with that email already exists', 409)
      }

      const passwordHash = await argon2.hash(password)

      return superAdminRepository.createSuperAdmin({ name, email, passwordHash })
    },

    async deactivateSuperAdmin(callerUser, targetId) {
      assertSuperAdminCaller(callerUser)

      if (callerUser.id === targetId) {
        throw serviceError('You cannot remove your own Super Admin account', 403)
      }

      const activeCount = await superAdminRepository.countActiveSuperAdmins()
      if (activeCount <= 1) {
        throw serviceError('Cannot remove the last active Super Admin', 403)
      }

      const updated = await superAdminRepository.deactivateSuperAdmin(targetId)
      if (!updated) {
        throw serviceError('Super Admin not found', 404)
      }

      return updated
    },
  }
}

const defaultService = createSuperAdminService()

export const listSuperAdmins = (callerUser) => defaultService.listSuperAdmins(callerUser)
export const createSuperAdmin = (callerUser, payload) => defaultService.createSuperAdmin(callerUser, payload)
export const deactivateSuperAdmin = (callerUser, targetId) => defaultService.deactivateSuperAdmin(callerUser, targetId)
