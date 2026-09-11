import * as demoService from '../services/demoService.js'

// ─── Rate limiting (simple in-memory, per-IP) ────────────────────────────────
const rateLimitMap = new Map() // ip -> { count, resetAt }
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX       = 30        // max 30 demo requests per minute per IP

function checkRateLimit(req) {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }
  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    throw Object.assign(new Error('Too many demo requests. Please wait a moment.'), { statusCode: 429 })
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function createSessionHandler(req, res, next) {
  try {
    checkRateLimit(req)
    const session = await demoService.createSession()
    res.status(201).json(session)
  } catch (err) { next(err) }
}

export async function getSessionHandler(req, res, next) {
  try {
    const session = await demoService.getSession(req.params.id)
    res.json(session)
  } catch (err) { next(err) }
}

export async function getDemoMenuHandler(req, res, next) {
  try {
    const sessionId = req.query.sessionId ?? req.body?.sessionId
    if (!sessionId) return next(Object.assign(new Error('sessionId is required'), { statusCode: 400 }))
    const menu = await demoService.getDemoMenu(sessionId)
    res.json(menu)
  } catch (err) { next(err) }
}

export async function placeDemoOrderHandler(req, res, next) {
  try {
    checkRateLimit(req)
    const { sessionId, items, notes } = req.body
    if (!sessionId) return next(Object.assign(new Error('sessionId is required'), { statusCode: 400 }))
    const result = await demoService.placeDemoOrder({ sessionId, items, notes })
    res.status(201).json(result)
  } catch (err) { next(err) }
}

export async function getDemoOrderStatusHandler(req, res, next) {
  try {
    const sessionId = req.query.sessionId ?? req.body?.sessionId
    if (!sessionId) return next(Object.assign(new Error('sessionId is required'), { statusCode: 400 }))
    const status = await demoService.getDemoOrderStatus(sessionId)
    res.json(status)
  } catch (err) { next(err) }
}

export async function cancelDemoOrderHandler(req, res, next) {
  try {
    const { sessionId, orderId } = req.body
    if (!sessionId || !orderId) return next(Object.assign(new Error('sessionId and orderId are required'), { statusCode: 400 }))
    const cancelled = await demoService.cancelDemoOrder(sessionId, orderId)
    res.json(cancelled)
  } catch (err) { next(err) }
}

export async function requestDemoBillHandler(req, res, next) {
  try {
    const { sessionId } = req.body
    if (!sessionId) return next(Object.assign(new Error('sessionId is required'), { statusCode: 400 }))
    const bill = await demoService.requestDemoBill(sessionId)
    res.json(bill)
  } catch (err) { next(err) }
}

export async function checkoutDemoHandler(req, res, next) {
  try {
    checkRateLimit(req)
    const { sessionId, billId } = req.body
    if (!sessionId || !billId) return next(Object.assign(new Error('sessionId and billId are required'), { statusCode: 400 }))
    const result = await demoService.checkoutDemoSimulated(sessionId, billId)
    res.json(result)
  } catch (err) { next(err) }
}

export async function endDemoSessionHandler(req, res, next) {
  try {
    // Session expiry is handled server-side naturally; this just returns confirmation
    // Frontend clears localStorage
    res.json({ ok: true, message: 'Demo session ended. Thank you for trying Chyaroma!' })
  } catch (err) { next(err) }
}
