import assert from 'node:assert/strict'
import test from 'node:test'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { createAuthService } from '../services/authService.js'

const config = { accessSecret: 'test-access-secret', refreshSecret: 'test-refresh-secret' }
const makeService = (users) =>
  createAuthService({
    repository: {
      findByEmail: async (email) => users.find((user) => user.email === email) ?? null,
      findById: async (id) => users.find((user) => user.id === id) ?? null,
    },
    config,
  })

test('Super Admin login carries a null branchId', async () => {
  const passwordHash = await argon2.hash('correct-password')
  const service = makeService([{
    id: 'admin-1', name: 'Owner', email: 'owner@cafe.test',
    passwordHash, role: 'super_admin', branchId: null,
    isActive: true, sessionVersion: 0,
    canLogin: true,   // ← real login account
  }])
  const session = await service.authenticate({ email: 'owner@cafe.test', password: 'correct-password' })
  assert.equal(session.user.branchId, null)
  assert.equal(jwt.decode(session.accessToken).branchId, null)
})

test('Manager and Kitchen Staff require a branchId to authenticate', async () => {
  const passwordHash = await argon2.hash('correct-password')
  const service = makeService([
    {
      id: 'manager-1', name: 'Manager', email: 'manager@cafe.test',
      passwordHash, role: 'branch_manager', branchId: 'branch-1',
      isActive: true, sessionVersion: 0,
      canLogin: true,   // ← real login account
    },
    {
      id: 'kitchen-1', name: 'Kitchen', email: 'kitchen@cafe.test',
      passwordHash, role: 'kitchen_staff', branchId: null,
      isActive: true, sessionVersion: 0,
      canLogin: true,   // ← real login account, but no branchId → scope error
    },
  ])
  assert.equal(
    (await service.authenticate({ email: 'manager@cafe.test', password: 'correct-password' })).user.branchId,
    'branch-1',
  )
  await assert.rejects(
    service.authenticate({ email: 'kitchen@cafe.test', password: 'correct-password' }),
    /Branch staff must have a branch scope/,
  )
})

test('invalid and expired access tokens are rejected', async () => {
  const service = makeService([{
    id: 'admin-1', name: 'Owner', email: 'owner@cafe.test',
    passwordHash: 'unused', role: 'super_admin', branchId: null,
    isActive: true, sessionVersion: 0, canLogin: true,
  }])
  await assert.rejects(service.verifyAccessToken('not-a-token'), /Authentication failed/)
  const expired = jwt.sign(
    { type: 'access', role: 'super_admin', branchId: null, sessionVersion: 0 },
    config.accessSecret,
    { subject: 'admin-1', expiresIn: -1 },
  )
  await assert.rejects(service.verifyAccessToken(expired), /Authentication failed/)
})

// ── New: staff-only records cannot authenticate ────────────────────────────

test('Staff-only record (canLogin false) cannot authenticate', async () => {
  const passwordHash = await argon2.hash('some-password')
  const service = makeService([{
    id: 'waiter-1', name: 'John', email: 'john@cafe.test',
    passwordHash,           // even if a hash somehow exists…
    role: 'waiter', branchId: 'branch-1',
    isActive: true, sessionVersion: 0,
    canLogin: false,        // ← staff-only: must not log in
  }])
  await assert.rejects(
    service.authenticate({ email: 'john@cafe.test', password: 'some-password' }),
    /Invalid email or password/,
  )
})

test('Staff-only record with null passwordHash cannot authenticate', async () => {
  const service = makeService([{
    id: 'cleaner-1', name: 'Jane', email: 'jane@cafe.test',
    passwordHash: null,     // no credentials stored
    role: 'cleaner', branchId: 'branch-1',
    isActive: true, sessionVersion: 0,
    canLogin: false,
  }])
  await assert.rejects(
    service.authenticate({ email: 'jane@cafe.test', password: 'anything' }),
    /Invalid email or password/,
  )
})
