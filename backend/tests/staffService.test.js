import assert from 'node:assert/strict'
import test from 'node:test'
import { createStaffService } from '../services/staffService.js'

const adminUser = { id: 'admin-1', role: 'super_admin', branchId: null }
const managerUser = { id: 'manager-1', role: 'branch_manager', branchId: 'branch-1' }
const kitchenUser = { id: 'kitchen-1', role: 'kitchen_staff', branchId: 'branch-1' }

const sampleManager = { id: 'manager-2', name: 'Alice', email: 'alice@cafe.test', role: 'branch_manager', branchId: 'branch-1', isActive: true }
const sampleKitchen = { id: 'kitchen-2', name: 'Bob', email: 'bob@cafe.test', role: 'kitchen_staff', branchId: 'branch-1', isActive: true }
const otherBranchKitchen = { id: 'kitchen-3', name: 'Carol', email: 'carol@cafe.test', role: 'kitchen_staff', branchId: 'branch-2', isActive: true }

const makeService = (users = [sampleManager, sampleKitchen, otherBranchKitchen]) => {
  const store = [...users]
  return createStaffService({
    repository: {
      listManagedStaff: async ({ branchId } = {}) =>
        store.filter((u) => u.role !== 'super_admin' && (branchId === undefined || u.branchId === branchId)),
      findById: async (id) => store.find((u) => u.id === id) ?? null,
      findByEmail: async (email) => store.find((u) => u.email === email) ?? null,
      create: async (payload) => {
        const user = { ...payload, id: `new-${Date.now()}`, isActive: true }
        store.push(user)
        return user
      },
      deactivateUser: async (id) => {
        const user = store.find((u) => u.id === id)
        user.isActive = false
        return user
      },
    },
  })
}

// ── Listing ────────────────────────────────────────────────────────────────

test('Super Admin lists all managers and branch staff', async () => {
  const service = makeService()
  const staff = await service.listStaff(adminUser)
  assert.equal(staff.length, 3)
  assert.ok(staff.every((s) => s.role !== 'super_admin'))
})

test('Manager lists only staff in their branch (all roles)', async () => {
  const service = makeService()
  const staff = await service.listStaff(managerUser)
  assert.equal(staff.length, 2)
  assert.ok(staff.every((s) => s.branchId === 'branch-1'))
})

test('Kitchen staff cannot access staff management', async () => {
  const service = makeService()
  await assert.rejects(async () => service.listStaff(kitchenUser), /Forbidden/)
})

// ── Creating login-capable staff ───────────────────────────────────────────

test('Super Admin creates a branch manager with branchId (requires password)', async () => {
  const service = makeService([])
  const created = await service.createStaff(adminUser, {
    name: 'New Mgr', email: 'mgr@cafe.test', password: 'secure123', role: 'branch_manager', branchId: 'branch-1',
  })
  assert.equal(created.role, 'branch_manager')
  assert.equal(created.branchId, 'branch-1')
  assert.equal(created.canLogin, true)
  assert.ok(created.passwordHash, 'branch_manager must have a passwordHash')
})

test('Manager creates kitchen staff for their own branch (requires password)', async () => {
  const service = makeService([])
  const created = await service.createStaff(managerUser, {
    name: 'Kitchen Guy', email: 'kg@cafe.test', password: 'secure123', role: 'kitchen_staff',
  })
  assert.equal(created.role, 'kitchen_staff')
  assert.equal(created.branchId, 'branch-1')
  assert.equal(created.canLogin, true)
  assert.ok(created.passwordHash, 'kitchen_staff must have a passwordHash')
})

test('branch_manager creation fails without a password', async () => {
  const service = makeService([])
  await assert.rejects(
    async () => service.createStaff(adminUser, { name: 'X', email: 'x@cafe.test', role: 'branch_manager', branchId: 'branch-1' }),
    /password are required/,
  )
})

// ── Creating staff records ─────────────────────────────────────────────────

test('Super Admin creates a waiter login account (requires password, canLogin true)', async () => {
  const service = makeService([])
  const created = await service.createStaff(adminUser, {
    name: 'Waiter', email: 'waiter@cafe.test', role: 'waiter', branchId: 'branch-1', password: 'waiterPass123',
  })
  assert.equal(created.role, 'waiter')
  assert.equal(created.branchId, 'branch-1')
  assert.equal(created.canLogin, true, 'waiter should be login-enabled')
  assert.ok(created.passwordHash, 'waiter must have a passwordHash')
})

test('waiter creation fails without a password', async () => {
  const service = makeService([])
  await assert.rejects(
    () => service.createStaff(managerUser, { name: 'Waiter Guy', email: 'wg@cafe.test', role: 'waiter' }),
    /password are required/,
  )
})

test('createStaff rejects a duplicate email with a friendly 409', async () => {
  const service = makeService() // already contains alice@cafe.test
  await assert.rejects(
    () => service.createStaff(adminUser, {
      name: 'Another Alice', email: 'alice@cafe.test', role: 'waiter', branchId: 'branch-1', password: 'Password123',
    }),
    /already exists/,
  )
})

test('Manager creates a cleaner — staff-only record', async () => {
  const service = makeService([])
  const created = await service.createStaff(managerUser, {
    name: 'Cleaner', email: 'cleaner@cafe.test', role: 'cleaner',
  })
  assert.equal(created.canLogin, false)
  assert.equal(created.passwordHash, null)
})

test('Manager creates a custom role — staff-only record', async () => {
  const service = makeService([])
  const created = await service.createStaff(managerUser, {
    name: 'Supervisor', email: 'sup@cafe.test', role: 'floor_supervisor',
  })
  assert.equal(created.role, 'floor_supervisor')
  assert.equal(created.canLogin, false)
  assert.equal(created.passwordHash, null)
})

// A password supplied for a non-login role must be silently ignored (not stored)
test('Password is ignored for staff-only roles even if supplied', async () => {
  const service = makeService([])
  const created = await service.createStaff(managerUser, {
    name: 'Barista', email: 'barista@cafe.test', role: 'barista', password: 'shouldbeignored',
  })
  assert.equal(created.canLogin, false)
  assert.equal(created.passwordHash, null)
})

test('Manager creates cashier for their branch (requires password, canLogin true)', async () => {
  const service = makeService([])
  const created = await service.createStaff(managerUser, {
    name: 'Cashier Person', email: 'cashier@cafe.test', password: 'cashierPass123', role: 'cashier',
  })
  assert.equal(created.role, 'cashier')
  assert.equal(created.branchId, 'branch-1')
  assert.equal(created.canLogin, true)
  assert.ok(created.passwordHash, 'cashier must have a passwordHash')
})

test('cashier creation fails without a password', async () => {
  const service = makeService([])
  await assert.rejects(
    async () => service.createStaff(managerUser, { name: 'Cashier Person', email: 'cashier@cafe.test', role: 'cashier' }),
    /password are required/,
  )
})

// ── Access control ─────────────────────────────────────────────────────────

test('Manager cannot create another manager', async () => {
  const service = makeService([])
  await assert.rejects(
    async () => service.createStaff(managerUser, { name: 'X', email: 'x@cafe.test', password: 'secure123', role: 'branch_manager' }),
    /Managers cannot create Managers/,
  )
})

test('Cannot create super_admin', async () => {
  const service = makeService([])
  await assert.rejects(
    async () => service.createStaff(adminUser, { name: 'X', email: 'x@cafe.test', password: 'secure123', role: 'super_admin', branchId: 'branch-1' }),
    /Cannot create a Super Admin/,
  )
})

test('createStaff requires name and email (all roles)', async () => {
  const service = makeService([])
  await assert.rejects(
    async () => service.createStaff(adminUser, { role: 'waiter', branchId: 'branch-1' }),
    /Name and email are required/,
  )
})

test('createStaff requires a role', async () => {
  const service = makeService([])
  await assert.rejects(
    async () => service.createStaff(managerUser, { name: 'X', email: 'x@cafe.test' }),
    /Role is required/,
  )
})

// ── Deactivating ───────────────────────────────────────────────────────────

test('Manager can deactivate staff in their branch', async () => {
  const service = makeService()
  const updated = await service.deactivateStaff(managerUser, 'kitchen-2')
  assert.equal(updated.isActive, false)
})

test('Manager cannot deactivate staff from another branch', async () => {
  const service = makeService()
  await assert.rejects(async () => service.deactivateStaff(managerUser, 'kitchen-3'), /Forbidden/)
})

test('Cannot deactivate super_admin', async () => {
  const service = makeService([{ id: 'admin-x', role: 'super_admin', branchId: null, isActive: true }])
  await assert.rejects(async () => service.deactivateStaff(adminUser, 'admin-x'), /not found/i)
})
