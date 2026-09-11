/**
 * demoService.js
 *
 * All demo-specific business logic lives here.
 * This service NEVER touches real branch kitchen queues, real inventory,
 * real payments, or real billing records.
 *
 * Socket.IO instance is injected at runtime so auto-progression can
 * emit to demo:<sessionId> rooms without coupling the service to server.js.
 */

import * as demo from '../repositories/demoRepository.js'
import * as menuRepo from '../repositories/menuRepository.js'
import * as settingsRepo from '../repositories/settingsRepository.js'

// ─── Error helper ────────────────────────────────────────────────────────────
const demoError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

// ─── Timing config (ms) ──────────────────────────────────────────────────────
const DEMO_ACCEPT_DELAY      = Number(process.env.DEMO_ACCEPT_DELAY)      || 4000
const DEMO_PREPARING_DELAY   = Number(process.env.DEMO_PREPARING_DELAY)   || 8000
const DEMO_READY_DELAY       = Number(process.env.DEMO_READY_DELAY)       || 12000
const DEMO_COMPLETED_DELAY   = Number(process.env.DEMO_COMPLETED_DELAY)   || 10000
const DEMO_SESSION_EXPIRY_MS = (Number(process.env.DEMO_SESSION_EXPIRY_HOURS) || 2) * 60 * 60 * 1000

// ─── Singleton demo branch / table IDs cached after first bootstrap ───────────
let _demoBranchId = null
let _demoTableId  = null

// Shared Socket.IO instance — set by server.js at startup
let _io = null

export function setIo(io) {
  _io = io
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function bootstrapDemoBranch() {
  _demoBranchId = await demo.upsertDemoBranch()
  _demoTableId  = await demo.upsertDemoTable(_demoBranchId)
  await seedDemoMenuIfNeeded(_demoBranchId)
  console.log(`✓ Demo Branch ready (branchId=${_demoBranchId}, tableId=${_demoTableId})`)
  // Periodic cleanup: remove expired sessions every 30 min
  setInterval(cleanExpiredSessions, 30 * 60 * 1000)
}

async function seedDemoMenuIfNeeded(branchId) {
  const existing = await menuRepo.listMenuItems(branchId)
  if (existing.length > 0) return // already seeded

  const categories = [
    { name: 'Hot Beverages',      sortOrder: 1 },
    { name: 'Cold Beverages',     sortOrder: 2 },
    { name: 'Mo:Mo & Dumplings',  sortOrder: 3 },
    { name: 'Bakery & Desserts',  sortOrder: 4 },
    { name: 'Burgers & Fast Food',sortOrder: 5 },
  ]

  const catMap = {}
  for (const cat of categories) {
    const created = await menuRepo.createCategory(branchId, { name: cat.name, sortOrder: cat.sortOrder })
    catMap[cat.name] = created.id
  }

  const items = [
    { category: 'Hot Beverages',      name: 'Caramel Cappuccino',          price: 220, description: 'Rich espresso with steamed milk foam and creamy caramel drizzle.',        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 5  },
    { category: 'Hot Beverages',      name: 'Himalayan Organic Green Tea',  price: 120, description: 'Handpicked Ilam tea leaves steeped to perfection with honey and lemon.',   imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 3  },
    { category: 'Cold Beverages',     name: 'Iced Vanilla Latte',           price: 250, description: 'Chilled espresso over milk and French vanilla syrup topped with ice.',     imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 4  },
    { category: 'Cold Beverages',     name: 'Fresh Mango Mint Smoothie',    price: 280, description: 'Real mango pulp blended with yogurt, crushed ice and fresh mint leaves.',  imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 5  },
    { category: 'Mo:Mo & Dumplings',  name: 'Steamed Chicken Mo:Mo',        price: 220, description: '10 pcs juicy chicken dumplings served with spicy tomato and sesame chutney.', imageUrl: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 12 },
    { category: 'Mo:Mo & Dumplings',  name: 'Kothey Veg Mo:Mo (Pan Fried)', price: 190, description: 'Pan-seared crispy bottom dumplings stuffed with fresh vegetables & cottage cheese.', imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 15 },
    { category: 'Bakery & Desserts',  name: 'Chocolate Lava Cake',          price: 260, description: 'Warm chocolate fudge cake with a melting gooey center, served with vanilla cream.', imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 8  },
    { category: 'Bakery & Desserts',  name: 'New York Cheesecake',          price: 320, description: 'Classic rich cream cheese slice on a graham cracker crust with berry compote.', imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 2  },
    { category: 'Burgers & Fast Food',name: 'Crispy Chicken Cheese Burger', price: 350, description: 'Crispy fried chicken breast, melted cheddar, lettuce, mayo on toasted brioche bun.', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 10 },
    { category: 'Burgers & Fast Food',name: 'Peri Peri Loaded Fries',       price: 210, description: 'Golden potato fries tossed in spicy peri-peri seasoning and topped with cheese sauce.', imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', prepTimeMinutes: 7  },
  ]

  for (const item of items) {
    await menuRepo.createMenuItem(branchId, {
      categoryId: catMap[item.category],
      name: item.name,
      price: item.price,
      description: item.description,
      imageUrl: item.imageUrl,
      prepTimeMinutes: item.prepTimeMinutes,
      isAvailable: true,
    })
  }

  console.log('✓ Demo menu seeded.')
}

async function cleanExpiredSessions() {
  try {
    await demo.deleteExpiredSessions()
  } catch (err) {
    console.error('Demo session cleanup error:', err)
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function createSession() {
  if (!_demoBranchId) throw demoError('Demo environment not ready', 503)
  const expiresAt = new Date(Date.now() + DEMO_SESSION_EXPIRY_MS).toISOString()
  const session = await demo.createDemoSession({ expiresAt })
  return {
    sessionId: session.id,
    branchId: _demoBranchId,
    tableId: _demoTableId,
    expiresAt: session.expires_at ?? expiresAt,
  }
}

export async function getSession(sessionId) {
  const session = await demo.findDemoSession(sessionId)
  if (!session) throw demoError('Demo session not found', 404)
  if (new Date(session.expires_at) < new Date()) throw demoError('Demo session expired', 410)
  return session
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function getDemoMenu(sessionId) {
  await getSession(sessionId) // validates session
  const [menu, categories] = await Promise.all([
    menuRepo.listMenuItems(_demoBranchId),
    menuRepo.listCategories(_demoBranchId),
  ])
  return {
    table: { tableNumber: 'DEMO-01', label: 'Demo Table' },
    categories,
    menu,
    isDemo: true,
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function placeDemoOrder({ sessionId, items, notes }) {
  await getSession(sessionId)
  if (!Array.isArray(items) || items.length === 0) throw demoError('At least one item is required')

  const order = await demo.createDemoOrder({
    branchId: _demoBranchId,
    tableId: _demoTableId,
    notes: notes ?? '',
    demoSessionId: sessionId,
  })

  const createdItems = []
  for (const item of items) {
    const menuItem = await menuRepo.findMenuItemById(item.itemId, _demoBranchId)
    if (!menuItem || !menuItem.isAvailable) throw demoError('Demo menu item not available', 400)
    createdItems.push(await demo.createDemoOrderItem({
      orderId: order.id,
      branchId: _demoBranchId,
      itemId: menuItem.id,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity: Number(item.quantity),
      notes: item.notes ?? '',
    }))
  }

  // Start background kitchen simulation (non-blocking)
  autoProgressOrder(order.id, sessionId).catch((err) =>
    console.error('Demo auto-progress error:', err),
  )

  return {
    order: { ...order, demoOrderNumber: `D-${order.id.slice(0, 6).toUpperCase()}` },
    items: createdItems,
  }
}

export async function getDemoOrderStatus(sessionId) {
  await getSession(sessionId)
  const orders = await demo.listDemoOrdersBySession(sessionId)
  const items = []
  for (const order of orders) {
    const orderItems = await demo.listDemoOrderItems(order.id)
    items.push(...orderItems.map((i) => ({ ...i, orderId: order.id })))
  }
  return {
    table: { tableNumber: 'DEMO-01', label: 'Demo Table' },
    orders: orders.map((o) => ({ ...o, demoOrderNumber: `D-${o.id.slice(0, 6).toUpperCase()}` })),
    items,
    isDemo: true,
  }
}

export async function cancelDemoOrder(sessionId, orderId) {
  await getSession(sessionId)
  const order = await demo.findDemoOrderById(orderId, sessionId)
  if (!order) throw demoError('Demo order not found', 404)
  if (order.status !== 'pending') throw demoError('Only pending demo orders can be cancelled', 400)
  const lockDeadline = new Date(new Date(order.createdAt).getTime() + 2 * 60 * 1000)
  if (new Date() > lockDeadline) throw demoError('Cancellation window has closed', 400)
  return demo.updateDemoOrderStatus(orderId, 'cancelled', {
    cancelledAt: new Date().toISOString(),
    cancellationReason: 'Cancelled by demo visitor',
  })
}

// ─── Kitchen simulation (server-side auto-progression) ───────────────────────

async function autoProgressOrder(orderId, sessionId) {
  const advance = (status, delayMs, fields) => new Promise((resolve) => {
    setTimeout(async () => {
      try {
        // Check order still exists and isn't cancelled before advancing
        const current = await demo.findDemoOrderById(orderId, sessionId)
        if (!current || current.status === 'cancelled') return resolve()
        const updated = await demo.updateDemoOrderStatus(orderId, status, fields)
        if (_io) {
          _io.to(`demo:${sessionId}`).emit('demo-order-updated', {
            orderId,
            status,
            order: { ...updated, demoOrderNumber: `D-${orderId.slice(0, 6).toUpperCase()}` },
          })
        }
      } catch (err) {
        console.error(`Demo auto-progress [${status}] error:`, err)
      }
      resolve()
    }, delayMs)
  })

  await advance('accepted',   DEMO_ACCEPT_DELAY,                          { acceptedAt: new Date(Date.now() + DEMO_ACCEPT_DELAY).toISOString() })
  await advance('preparing',  DEMO_PREPARING_DELAY,                       { preparingAt: new Date(Date.now() + DEMO_PREPARING_DELAY).toISOString() })
  await advance('ready',      DEMO_READY_DELAY,                           { readyAt: new Date(Date.now() + DEMO_READY_DELAY).toISOString() })
  await advance('completed',  DEMO_COMPLETED_DELAY,                       { completedAt: new Date(Date.now() + DEMO_COMPLETED_DELAY).toISOString() })
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export async function requestDemoBill(sessionId) {
  await getSession(sessionId)

  // Check for existing demo bill
  const existing = await demo.findDemoBillBySession(sessionId)
  const branchSettings = await settingsRepo.findSettingsByBranch(_demoBranchId)
  const taxRate = branchSettings?.taxRate ?? 13

  // Gather all completed/ready demo orders not yet billed
  const orders = await demo.listDemoOrdersBySession(sessionId)
  if (orders.length === 0) throw demoError('No demo orders to bill', 404)

  const billableOrders = orders.filter((o) => ['completed', 'ready', 'preparing', 'accepted', 'pending'].includes(o.status))
  if (billableOrders.length === 0) throw demoError('No billable demo orders', 404)

  const allItems = []
  for (const order of billableOrders) {
    const items = await demo.listDemoOrderItems(order.id)
    allItems.push(...items)
  }

  const subtotal = Number(allItems.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0).toFixed(2))
  const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2))
  const totalAmount = Number((subtotal + taxAmount).toFixed(2))

  if (existing) {
    return { ...existing, items: allItems, isDemo: true }
  }

  const bill = await demo.createDemoBill({
    branchId: _demoBranchId,
    tableId: _demoTableId,
    orderIds: billableOrders.map((o) => o.id),
    subtotal,
    taxRate,
    taxAmount,
    discountAmount: 0,
    totalAmount,
    demoSessionId: sessionId,
  })

  return { ...bill, items: allItems, isDemo: true }
}

export async function checkoutDemoSimulated(sessionId, billId) {
  await getSession(sessionId)
  const bill = await demo.findDemoBillById(billId, sessionId)
  if (!bill) throw demoError('Demo bill not found', 404)
  if (bill.checkoutApprovedAt) throw demoError('Demo checkout already completed', 409)

  // Simulated payment — no real payment gateway, no inventory deduction
  const approved = await demo.approveDemoBill(billId)

  // Emit to demo socket room
  if (_io) {
    _io.to(`demo:${sessionId}`).emit('demo-bill-updated', {
      sessionId,
      bill: { ...approved, isDemo: true },
    })
  }

  return { ...approved, isDemo: true, message: 'Demo payment simulated. No real transaction occurred.' }
}
