import argon2 from 'argon2'
import * as userRepository from '../repositories/userRepository.js'
import { getDemoBranchId } from '../repositories/demoRepository.js'

const staffError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

// Roles that require a real application login account with hashed credentials.
// super_admin, branch_manager, kitchen_staff, cashier.
// Every other role (waiter, barista, host, cleaner, custom, …) is a
// staff-only record: no password, no authentication credentials, cannot log in.
const LOGIN_ROLES = new Set(['super_admin', 'branch_manager', 'kitchen_staff', 'cashier'])

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

      if (needsLogin) {
        // ── LOGIN ACCOUNT PATH ──────────────────────────────────────────────
        // branch_manager and kitchen_staff require app access; a real password
        // must be supplied and is hashed before storage.
        const password = payload.password
        if (!password) throw staffError('Name, email, and password are required')
        return repository.create({
          name,
          email,
          passwordHash: await argon2.hash(password),
          role,
          branchId,
          canLogin: true,
        })
      } else {
        // ── STAFF-ONLY RECORD PATH ──────────────────────────────────────────
        // Waiter, Cleaner, Host, Cashier, Barista, any custom role.
        // No password is accepted or stored.  The record cannot log in.
        return repository.create({
          name,
          email,
          passwordHash: null,
          role,
          branchId,
          canLogin: false,
        })
      }
    },

    async deactivateStaff(user, staffId) {
      assertStaffManagementAccess(user)
      const target = await repository.findById(staffId)
      if (!target || target.role === 'super_admin') throw staffError('Staff member not found', 404)
      if (user.role === 'branch_manager' && (target.branchId !== user.branchId)) throw staffError('Forbidden', 403)
      return repository.deactivateUser(staffId)
    },
  }
}

const service = createStaffService()
export const listStaff = (...args) => service.listStaff(...args)
export const createStaff = (...args) => service.createStaff(...args)
export const deactivateStaff = (...args) => service.deactivateStaff(...args)
