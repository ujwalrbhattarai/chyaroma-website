import { verifyAccessToken } from '../services/authService.js'
export async function requireAuthentication(request, _response, next) { try { const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, ''); request.user = await verifyAccessToken(request.cookies.cc_access ?? bearer); next() } catch (error) { next(error) } }
export const requireRoles = (...allowedRoles) => (request, _response, next) => { if (!request.user || !allowedRoles.includes(request.user.role)) return next(Object.assign(new Error('Forbidden'), { statusCode: 403 })); next() }
