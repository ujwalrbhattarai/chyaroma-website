import assert from 'node:assert/strict'
import test from 'node:test'
import { createBranchService } from '../services/branchService.js'

const adminUser = { id: 'admin-1', role: 'super_admin', branchId: null }
const managerUser = { id: 'manager-1', role: 'branch_manager', branchId: 'branch-1' }

const sampleBranch = {
  id: 'branch-1', name: 'Main Street', address: '1 Main St', contactPhone: '0001112222',
  contactEmail: 'main@cafe.test', taxRate: 10, openingHours: '08:00–22:00', isActive: true,
}

const makeService = (branches = [sampleBranch]) => {
  const store = [...branches]
  return createBranchService({
    repository: {
      listBranches: async () => store,
      findBranchById: async (id) => store.find((b) => b.id === id) ?? null,
      createBranch: async (payload) => { const branch = { ...payload, id: 'new-branch', isActive: true }; store.push(branch); return branch },
      updateBranch: async (id, payload) => { const index = store.findIndex((b) => b.id === id); store[index] = { ...store[index], ...payload }; return store[index] },
      deactivateBranch: async (id) => { const branch = store.find((b) => b.id === id); branch.isActive = false; return branch },
    },
  })
}

test('Super Admin can list branches', async () => {
  const service = makeService()
  const branches = await service.listBranches(adminUser)
  assert.equal(branches.length, 1)
  assert.equal(branches[0].name, 'Main Street')
})

test('Demo Branch cannot be modified or deactivated', async () => {
  const demoBranch = { id: 'demo-1', name: 'Demo Branch', isDemo: true, isActive: true }
  const service = makeService([sampleBranch, demoBranch])
  await assert.rejects(() => service.updateBranch(adminUser, 'demo-1', { name: 'Changed' }), /system branch/i)
  await assert.rejects(() => service.deactivateBranch(adminUser, 'demo-1'), /system branch/i)
})

test('Manager cannot list branches', async () => {
  const service = makeService()
  await assert.rejects(async () => service.listBranches(managerUser), /Forbidden/)
})

test('Super Admin can create a branch', async () => {
  const service = makeService([])
  const branch = await service.createBranch(adminUser, {
    name: 'New Branch', address: '2 Side St', contactPhone: '0009998888',
    contactEmail: 'side@cafe.test', taxRate: 5, openingHours: '09:00–21:00',
  })
  assert.equal(branch.name, 'New Branch')
  assert.equal(branch.taxRate, 5)
})

test('createBranch rejects missing required fields', async () => {
  const service = makeService([])
  await assert.rejects(async () => service.createBranch(adminUser, { name: 'Only Name' }), /required/)
})

test('createBranch rejects negative taxRate', async () => {
  const service = makeService([])
  await assert.rejects(
    async () => service.createBranch(adminUser, { name: 'X', address: 'Y', contactPhone: '1', contactEmail: 'a@b.test', taxRate: -1, openingHours: '8–10' }),
    /taxRate/,
  )
})

test('Super Admin can deactivate a branch', async () => {
  const service = makeService()
  const branch = await service.deactivateBranch(adminUser, 'branch-1')
  assert.equal(branch.isActive, false)
})

test('deactivateBranch throws 404 for missing branch', async () => {
  const service = makeService([])
  await assert.rejects(() => service.deactivateBranch(adminUser, 'ghost-id'), /not found/i)
})

test('Manager cannot deactivate a branch', async () => {
  const service = makeService()
  await assert.rejects(() => service.deactivateBranch(managerUser, 'branch-1'), /Forbidden/)
})
