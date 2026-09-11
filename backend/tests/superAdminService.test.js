import assert from 'node:assert/strict'
import test from 'node:test'
import { createSuperAdminService } from '../services/superAdminService.js'

const superAdminUser1 = { id: 'sa-1', role: 'super_admin', email: 'admin1@test.com' }
const superAdminUser2 = { id: 'sa-2', role: 'super_admin', email: 'admin2@test.com' }
const managerUser = { id: 'mgr-1', role: 'branch_manager', email: 'mgr@test.com' }

const makeService = (repoOverrides = {}) => {
  const repository = {
    listSuperAdmins: async () => [
      { id: 'sa-1', name: 'Admin One', email: 'admin1@test.com', isActive: true },
      { id: 'sa-2', name: 'Admin Two', email: 'admin2@test.com', isActive: true },
    ],
    emailExists: async () => false,
    createSuperAdmin: async (data) => ({ id: 'sa-new', ...data, isActive: true }),
    countActiveSuperAdmins: async () => 2,
    deactivateSuperAdmin: async (id) => ({ id, name: 'Admin Two', email: 'admin2@test.com', role: 'super_admin', isActive: false }),
    ...repoOverrides,
  }
  return createSuperAdminService({ repository })
}

test('listSuperAdmins - forbidden for non-super-admin', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.listSuperAdmins(managerUser),
    (err) => err.statusCode === 403 && /Forbidden/.test(err.message)
  )
})

test('listSuperAdmins - success for super admin caller', async () => {
  const service = makeService()
  const result = await service.listSuperAdmins(superAdminUser1)
  assert.equal(result.length, 2)
})

test('createSuperAdmin - enforces super_admin caller', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.createSuperAdmin(managerUser, { name: 'SA', email: 'sa@test.com', password: 'password123' }),
    (err) => err.statusCode === 403
  )
})

test('createSuperAdmin - rejects short password', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.createSuperAdmin(superAdminUser1, { name: 'SA', email: 'sa@test.com', password: 'short' }),
    (err) => err.statusCode === 400 && /at least 8 characters/.test(err.message)
  )
})

test('createSuperAdmin - rejects duplicate email', async () => {
  const service = makeService({ emailExists: async () => true })
  await assert.rejects(
    async () => service.createSuperAdmin(superAdminUser1, { name: 'SA', email: 'admin1@test.com', password: 'password123' }),
    (err) => err.statusCode === 409 && /already exists/.test(err.message)
  )
})

test('deactivateSuperAdmin - prevents self-deactivation', async () => {
  const service = makeService()
  await assert.rejects(
    async () => service.deactivateSuperAdmin(superAdminUser1, 'sa-1'),
    (err) => err.statusCode === 403 && /cannot remove your own/.test(err.message)
  )
})

test('deactivateSuperAdmin - prevents deactivation when activeCount <= 1', async () => {
  const service = makeService({ countActiveSuperAdmins: async () => 1 })
  await assert.rejects(
    async () => service.deactivateSuperAdmin(superAdminUser1, 'sa-2'),
    (err) => err.statusCode === 403 && /last active Super Admin/.test(err.message)
  )
})

test('deactivateSuperAdmin - throws 404 if super admin not found', async () => {
  const service = makeService({ deactivateSuperAdmin: async () => null })
  await assert.rejects(
    async () => service.deactivateSuperAdmin(superAdminUser1, 'sa-999'),
    (err) => err.statusCode === 404 && /not found/.test(err.message)
  )
})

test('deactivateSuperAdmin - successfully deactivates valid target', async () => {
  const service = makeService()
  const result = await service.deactivateSuperAdmin(superAdminUser1, 'sa-2')
  assert.equal(result.id, 'sa-2')
  assert.equal(result.isActive, false)
})
