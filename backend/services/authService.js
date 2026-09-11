import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import * as userRepository from '../repositories/userRepository.js'

const accessExpiresIn = '15m', refreshExpiresIn = '7d', accessExpiresInMs = 900000, refreshExpiresInMs = 604800000
const authError = (message = 'Authentication failed') => Object.assign(new Error(message), { statusCode: 401 })

// Staff roles are now flexible (waiter, cashier, etc.). Only the scope rule matters:
// super_admin is branch-less; every other role must belong to a branch.
export function assertStaffScope(user) {
  if (!user) throw authError()
  if (user.role === 'super_admin') {
    if (user.branchId !== null) throw authError('Invalid Super Admin scope')
    return
  }
  if (!user.branchId) throw authError('Branch staff must have a branch scope')
}

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId })

export function createAuthService({ repository = userRepository, config = { accessSecret: process.env.JWT_ACCESS_SECRET, refreshSecret: process.env.JWT_REFRESH_SECRET } } = {}) {
  const assertSecrets = () => { if (!config.accessSecret || !config.refreshSecret) throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required') }
  const issueTokens = (user) => { assertSecrets(); const claims = { role: user.role, branchId: user.branchId, sessionVersion: user.sessionVersion }; return { accessToken: jwt.sign({ ...claims, type: 'access' }, config.accessSecret, { subject: user.id, expiresIn: accessExpiresIn }), refreshToken: jwt.sign({ ...claims, type: 'refresh' }, config.refreshSecret, { subject: user.id, expiresIn: refreshExpiresIn }) } }
  const verifyToken = async (token, type) => { if (!token) throw authError(); assertSecrets(); try { const payload = jwt.verify(token, type === 'access' ? config.accessSecret : config.refreshSecret); if (payload.type !== type) throw authError(); const user = await repository.findById(payload.sub); if (!user || !user.isActive || user.sessionVersion !== payload.sessionVersion) throw authError(); assertStaffScope(user); return user } catch (error) { if (error.statusCode) throw error; throw authError() } }

  const authenticate = async ({ email, password }) => {
    if (!email || !password) throw authError('Email and password are required')
    const user = await repository.findByEmail(email.trim().toLowerCase())
    // SECURITY: reject staff-only records that have no login credentials.
    // canLogin must be explicitly TRUE — this check happens backend-only and
    // cannot be bypassed by any frontend change.
    if (!user || !user.isActive || user.canLogin !== true) throw authError('Invalid email or password')
    // Only attempt password verification for genuine login accounts.
    if (!(await argon2.verify(user.passwordHash, password))) throw authError('Invalid email or password')
    assertStaffScope(user)
    return { user: publicUser(user), ...issueTokens(user), accessExpiresInMs, refreshExpiresInMs }
  }

  const refreshSession = async (token) => { const user = await verifyToken(token, 'refresh'); return { user: publicUser(user), ...issueTokens(user), accessExpiresInMs, refreshExpiresInMs } }
  return { authenticate, verifyAccessToken: (token) => verifyToken(token, 'access'), refreshSession }
}

const service = createAuthService()
export const authenticate = service.authenticate
export const refreshSession = service.refreshSession
export const verifyAccessToken = service.verifyAccessToken

export async function revokeSession(userId) { await userRepository.incrementSessionVersion(userId) }

export async function bootstrapSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SUPER_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required')
  if (await userRepository.findByEmail(email)) return
  // Bootstrap super admin always gets canLogin: true
  await userRepository.create({ name: 'Super Admin', email, passwordHash: await argon2.hash(password), role: 'super_admin', branchId: null, canLogin: true })
}
