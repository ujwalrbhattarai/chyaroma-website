import argon2 from 'argon2'
import * as userRepository from '../repositories/userRepository.js'
import { getDemoBranchId } from '../repositories/demoRepository.js'

const staffError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

// Roles that require a real application login account with hashed credentials.
// super_admin, branch_manager, kitchen_staff, cashier, waiter.
// Every other role (barista, host, cleaner, custom, …) is a
// staff-only record: no password, no authentication credentials, cannot log in.
const LOGIN_ROLES = new Set(['super_admin', 'branch_manager', 'kitchen_staff', 'cashier', 'waiter'])

// Roles that ordinary branch managers cannot create.
const PROTECTED_ROLES = new Set(['super_admin', 'branch_manager'])

export function assertStaffManagementAccess(user) {
  if (!user || !['super_admin', 'branch_manager'].includes(user.role)) throw staffError('Forbidden', 403)
}

function normalizeEmail(email) { return email?.trim().toLowerCase() }

function assertBranchScope(user, branchId) {
  if (user.role === 'super_admin') return branchId
  if (user.role === 'branch_manager' && branchId === user.branchId) return user.branchId
  throw staffError('Forbidden', 403)
}

export function createStaffService({ repository = userRepository } = {}) {
  return {
    async listStaff(user) {
      assertStaffManagementAccess(user)
      if (user.role === 'super_admin') return repository.listManagedStaff()
      return repository.listManagedStaff({ branchId: user.branchId })
    },

    async createStaff(user, payload) {
      assertStaffManagementAccess(user)

      const name = payload.name?.trim()
      const email = normalizeEmail(payload.email)
      const role = payload.role?.trim() || ''
      const branchId = user.role === 'super_admin' ? payload.branchId : user.branchId

      // Friendly duplicate-email handling: an ACTIVE account blocks re-adding; a DEACTIVATED
      // account with the same email is reactivated (reused) so staff can be added again, even
      // with the exact same email.
      const existing = await repository.findByEmail?.(email)
      if (existing && existing.isActive) {
        throw staffError('An account with this email already exists and is active. Deactivate it first, or use a different email.', 409)
      }

      // Branch-scope validation
      if (user.role === 'super_admin' && !branchId) throw staffError('branchId is required')
      assertBranchScope(user, branchId)

      // Common field validation
      if (!name || !email) throw staffError('Name and email are required')
      if (!role) throw staffError('Role is required')
      if (role === 'super_admin') throw staffError('Cannot create a Super Admin', 403)
      if (user.role !== 'super_admin' && PROTECTED_ROLES.has(role)) throw staffError('Managers cannot create Managers or Super Admins', 403)

      // Prevent assigning any staff to the Demo Branch
      const demoBranchId = await getDemoBranchId()
      if (demoBranchId && branchId === demoBranchId) throw staffError('Staff cannot be assigned to the Demo Branch.', 403)

      const needsLogin = LOGIN_ROLES.has(role)
      const password = needsLogin ? payload.password : undefined
      if (needsLogin && !password) throw staffError('Name, email, and password are required')
      const passwordHash = needsLogin ? await argon2.hash(password) : null
      const fields = { name, email, role, branchId, canLogin: needsLogin, passwordHash }

      if (existing) {
        // Reuse the deactivated account with this email and bring it back as active.
        return repository.reactivateUser(existing.id, fields)
      }
      return repository.create(fields)
    },

    async deactivateStaff(user, staffId) {
      assertStaffManagementAccess(user)
      const target = await repository.findById(staffId)
      if (!target || target.role === 'super_admin') throw staffError('Staff member not found', 404)
      if (user.role === 'branch_manager' && (target.branchId !== user.branchId)) throw staffError('Forbidden', 403)
      return repository.deactivateUser(staffId)
    },

    async deleteStaff(user, staffId) {
      assertStaffManagementAccess(user)
      const target = await repository.findById(staffId)
      if (!target || target.role === 'super_admin') throw staffError('Staff member not found', 404)
      if (user.role === 'branch_manager' && (target.branchId !== user.branchId)) throw staffError('Forbidden', 403)
      // Safety: only allow permanent deletion of staff that are already deactivated.
      if (target.isActive) throw staffError('Deactivate the staff member before deleting them.', 409)
      await repository.deleteUser(staffId)
      return { deleted: true, id: staffId }
    },
  }
}

const service = createStaffService()
export const listStaff = (...args) => service.listStaff(...args)
export const createStaff = (...args) => service.createStaff(...args)
export const deactivateStaff = (...args) => service.deactivateStaff(...args)
export const deleteStaff = (...args) => service.deleteStaff(...args)
