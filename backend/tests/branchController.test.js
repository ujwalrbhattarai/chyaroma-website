import assert from 'node:assert/strict'
import test from 'node:test'
import { createBranchHandler, deactivateBranchHandler, getBranches, updateBranchHandler } from '../controllers/branchController.js'

const managerUser = { id: 'manager-1', role: 'branch_manager', branchId: 'branch-1' }

const makeResponse = () => ({
  statusCode: 0,
  payload: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.payload = body; return this },
})

test('Manager-role token hitting branch CRUD endpoints is rejected', async () => {
  const requests = [
    [getBranches, {}],
    [createBranchHandler, { body: {} }],
    [updateBranchHandler, { params: { branchId: 'branch-1' }, body: {} }],
    [deactivateBranchHandler, { params: { branchId: 'branch-1' } }],
  ]

  for (const [handler, extra] of requests) {
    let capturedError = null
    await handler({ user: managerUser, ...extra }, makeResponse(), (error) => { capturedError = error })
    assert.equal(capturedError.statusCode, 403)
    assert.match(capturedError.message, /Forbidden/)
  }
})
