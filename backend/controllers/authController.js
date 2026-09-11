import { authenticate, refreshSession, revokeSession } from '../services/authService.js'
// Render sets RENDER for deployed services. Treat it as production even when
// NODE_ENV was not explicitly added in the dashboard, so cross-subdomain
// cookies work consistently between www.chyaroma.com and api.chyaroma.com.
const production = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER)
const options = { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/' }
function sendSession(response, session) { return response.cookie('cc_access', session.accessToken, { ...options, maxAge: session.accessExpiresInMs }).cookie('cc_refresh', session.refreshToken, { ...options, maxAge: session.refreshExpiresInMs }).status(200).json({ user: session.user }) }
export async function login(request, response, next) { try { sendSession(response, await authenticate(request.body)) } catch (error) { next(error) } }
export async function refresh(request, response, next) { try { sendSession(response, await refreshSession(request.cookies.cc_refresh)) } catch (error) { next(error) } }
export async function logout(request, response, next) { try { if (request.user) await revokeSession(request.user.id); response.clearCookie('cc_access', options).clearCookie('cc_refresh', options).status(204).end() } catch (error) { next(error) } }
export function currentUser(request, response) { response.status(200).json({ user: request.user }) }
export function authErrorHandler(error, _request, response, _next) { const status = error.statusCode ?? 500; response.status(status).json({ error: status === 500 ? 'Internal server error' : error.message }) }
