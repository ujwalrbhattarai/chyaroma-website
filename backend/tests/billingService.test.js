import assert from 'node:assert/strict'
import test from 'node:test'
import { createBillingService } from '../services/billingService.js'

const BRANCH = 'branch-1'
const TABLE  = 'table-1'

const sampleOrder = { id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'ready' }
const sampleItem  = { id: 'oi-1', orderId: 'ord-1', branchId: BRANCH, unitPrice: 100, quantity: 2 }
const sampleBill  = { id: 'bill-1', branchId: BRANCH, tableId: TABLE, subtotal: 200, taxRate: 10, taxAmount: 20, discountAmount: 0, totalAmount: 220, status: 'draft', immutableAt: null }

const makeService = ({ orderList = [sampleOrder], orderItemList = [sampleItem], billList = [], paymentList = [], taxRate = 10, tables = null } = {}) => {
  const bills = [...billList]
  const payments = [...paymentList]
  return createBillingService({
    deduct: async () => {},
    bills: {
      findBillById:           async (id, branchId) => bills.find((b) => b.id === id && b.branchId === branchId) ?? null,
      findBillByIdAcrossBranches: async (id) => bills.find((b) => b.id === id) ?? null,
      deleteDraftBillsByTable: async (branchId, tableId) => {
        const removed = bills.filter((b) => b.branchId === branchId && b.tableId === tableId && b.status === 'draft')
        for (const b of removed) bills.splice(bills.indexOf(b), 1)
        return removed
      },
      findDraftBillByTable:   async (branchId, tableId) => bills.find((b) => b.branchId === branchId && b.tableId === tableId && b.status === 'draft') ?? null,
      findLatestApprovedBillByTable: async (branchId, tableId) => bills.find((b) => b.branchId === branchId && b.tableId === tableId && b.checkoutApprovedAt) ?? null,
      listBilledOrderIdsByTable: async (branchId, tableId) => bills.filter((b) => b.branchId === branchId && b.tableId === tableId).flatMap((b) => b.orderIds ?? []),
      listBillsByTable:       async (branchId, tableId) => bills.filter((b) => b.branchId === branchId && b.tableId === tableId).sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)),
      createBill:             async (payload) => { const b = { ...payload, id: `bill-${Date.now()}`, status: payload.status ?? 'draft', immutableAt: null }; bills.push(b); return b },
      updateBill:             async (id, branchId, payload) => { const b = bills.find((b) => b.id === id && b.branchId === branchId); Object.assign(b, payload); return b },
      finalizeBill:           async (id, branchId) => { const b = bills.find((b) => b.id === id); b.status = 'finalized'; b.immutableAt = new Date().toISOString(); return b },
      finalizeBillWithApproval: async (id, branchId, checkoutApprovedAt) => { const b = bills.find((b) => b.id === id && b.branchId === branchId); b.status = 'finalized'; b.immutableAt = new Date().toISOString(); b.checkoutApprovedAt = checkoutApprovedAt; return b },
      markBillCheckoutApproved: async (id, branchId, checkoutApprovedAt) => { const b = bills.find((b) => b.id === id && b.branchId === branchId); b.checkoutApprovedAt = checkoutApprovedAt; return b },
      updateBillAttempt:      async (id, branchId, payload) => { const b = bills.find((b) => b.id === id); Object.assign(b, payload); return b },
      listBillsByBranch:      async (branchId) => bills.filter((b) => b.branchId === branchId),
    },
    orders: {
      listOrdersReadyForBilling: async (branchId, tableId) => orderList.filter((o) => o.branchId === branchId && o.tableId === tableId),
      completeTableOrders: async (branchId, tableId) => {
        const completed = []
        for (const order of orderList) {
          if (order.branchId === branchId && order.tableId === tableId && order.status !== 'cancelled' && order.status !== 'completed') {
            order.status = 'completed'
            completed.push(order)
          }
        }
        return completed
      },
      hideTableOrdersFromCustomer: async (branchId, tableId) => {
        const hidden = []
        for (const order of orderList) {
          if (order.branchId === branchId && order.tableId === tableId && order.customerVisible !== false) {
            order.customerVisible = false
            hidden.push(order)
          }
        }
        return hidden
      },
    },
    orderItems: {
      listOrderItems: async (orderId) => orderItemList.filter((i) => i.orderId === orderId),
    },
    payments: {
      createPayment: async (payload) => { const p = { ...payload, id: `pay-${Date.now()}` }; payments.push(p); return p },
    },
    settings: {
      findSettingsByBranch: async () => ({ taxRate }),
    },
    tables: tables ?? {
      findTableByToken: async (token) => token === 'tok-1' ? { id: TABLE, branchId: BRANCH, qrToken: 'tok-1' } : null,
    },
  })
}

test('generateBill computes subtotal, tax, and total correctly', async () => {
  const service = makeService()
  const bill = await service.generateBill(BRANCH, TABLE)
  assert.equal(bill.subtotal, 200)    // 100 * 2
  assert.equal(bill.taxRate, 10)
  assert.equal(bill.taxAmount, 20)
  assert.equal(bill.totalAmount, 220)
})

test('requestPublicBill returns bill for valid table token with completed orders', async () => {
  const table = { id: TABLE, branchId: BRANCH, qrToken: 'tok-1' }
  const service = makeService({
    orderList: [{ id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'completed' }],
    tables: { findTableByToken: async (token) => token === 'tok-1' ? table : null },
  })
  const bill = await service.requestPublicBill('tok-1')
  assert.equal(bill.subtotal, 200)
  assert.equal(bill.taxAmount, 20)
  assert.equal(bill.items.length, 1)
})

test('generateBill throws 404 when no billable orders exist', async () => {
  const service = makeService({ orderList: [] })
  await assert.rejects(async () => service.generateBill(BRANCH, TABLE), /No billable orders/i)
})

test('finalizeBill marks bill as finalized', async () => {
  const service = makeService({ billList: [{ ...sampleBill }] })
  const bill = await service.finalizeBill(BRANCH, 'bill-1')
  assert.equal(bill.status, 'finalized')
  assert.ok(bill.immutableAt)
})

test('finalizeBill throws 404 for unknown bill', async () => {
  const service = makeService()
  await assert.rejects(async () => service.finalizeBill(BRANCH, 'ghost-bill'), /not found/i)
})

test('recordPayment finalizes the bill after payment', async () => {
  const service = makeService({ billList: [{ ...sampleBill }] })
  const bill = await service.recordPayment(BRANCH, 'bill-1', 220, 'cash')
  assert.equal(bill.status, 'finalized')
})

test('checkoutPublicBill creates a checkout request for draft bills', async () => {
  const service = makeService({ billList: [{ ...sampleBill, status: 'draft' }], orderList: [{ id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'ready' }] })
  const result = await service.checkoutPublicBill('tok-1', 'bill-1', 'cash')
  assert.equal(result.status, 'draft')
  assert.ok(result.checkoutRequestedAt)
  assert.equal(result.checkoutRequestMethod, 'cash')
})

test('approveCheckout persists approval after finalizing the bill', async () => {
  const service = makeService({
    billList: [{ ...sampleBill, status: 'draft', checkoutRequestedAt: new Date().toISOString(), checkoutRequestMethod: 'cash' }],
    orderList: [{ id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'ready' }],
  })

  const result = await service.approveCheckout(BRANCH, 'bill-1', 'cash')
  assert.equal(result.status, 'finalized')
  assert.ok(result.checkoutApprovedAt)
  assert.equal(result.paymentMethod, 'cash')
  assert.equal(service, service)
})

test('approveCheckout works for super admin (branchId null) across branches', async () => {
  const service = makeService({
    billList: [{ ...sampleBill, status: 'draft', checkoutRequestedAt: new Date().toISOString(), checkoutRequestMethod: 'cash' }],
    orderList: [{ id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'ready' }],
  })

  // Super admin passes branchId = null
  const result = await service.approveCheckout(null, 'bill-1', 'cash')
  assert.equal(result.status, 'finalized')
  assert.ok(result.checkoutApprovedAt)
  assert.equal(result.paymentMethod, 'cash')
})

test('approveCheckout clears leftover draft bills so the table becomes vacant', async () => {
  const draftBill = { ...sampleBill, status: 'draft', checkoutRequestedAt: new Date().toISOString(), checkoutRequestMethod: 'cash' }
  const staleDraft = { ...sampleBill, id: 'bill-stale', status: 'draft', checkoutRequestedAt: null }
  const service = makeService({
    billList: [draftBill, staleDraft],
    orderList: [{ id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'ready' }],
  })

  const result = await service.approveCheckout(BRANCH, 'bill-1', 'cash')
  assert.equal(result.status, 'finalized')
  assert.ok(result.checkoutApprovedAt)
  // The stale draft bill should have been removed
  const remaining = await service.listBranchBills(BRANCH)
  assert.ok(!remaining.some((b) => b.id === 'bill-stale'))
})

test('mutateBillAttempt throws 409 on immutable finalized bill', async () => {
  const frozenBill = { ...sampleBill, status: 'finalized', immutableAt: new Date().toISOString() }
  const service = makeService({ billList: [frozenBill] })
  await assert.rejects(async () => service.mutateBillAttempt(BRANCH, 'bill-1', { discountAmount: 10 }), /immutable/i)
})

test('addAdjustment creates a linked adjustment bill', async () => {
  const finalizedBill = { ...sampleBill, status: 'finalized', immutableAt: new Date().toISOString() }
  const service = makeService({ billList: [finalizedBill] })
  const adj = await service.addAdjustment(BRANCH, 'bill-1', { totalAmount: 200 })
  assert.equal(adj.status, 'adjustment')
  assert.equal(adj.adjustmentOfBillId, 'bill-1')
  assert.equal(adj.totalAmount, 200)
})

test('requestPublicBill after approval returns the approved bill so the table stays vacant', async () => {
  const table = { id: TABLE, branchId: BRANCH, qrToken: 'tok-1' }
  const approvedBill = { ...sampleBill, status: 'finalized', immutableAt: new Date().toISOString(), orderIds: ['ord-1'], checkoutRequestedAt: new Date().toISOString(), checkoutApprovedAt: new Date().toISOString(), checkoutRequestMethod: 'cash' }
  const service = makeService({
    orderList: [{ id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'completed' }],
    billList: [approvedBill],
    tables: { findTableByToken: async (token) => token === 'tok-1' ? table : null },
  })
  const bill = await service.requestPublicBill('tok-1')
  // Already-billed (completed) orders are excluded from a new bill, so the approved bill is returned
  assert.equal(bill.id, 'bill-1')
  assert.ok(bill.checkoutApprovedAt)
  assert.deepEqual(bill.items, [])
})

test('requestPublicBill returns pending checkout bill with items until approved', async () => {
  const table = { id: TABLE, branchId: BRANCH, qrToken: 'tok-1' }
  const requestedBill = {
    ...sampleBill,
    id: 'bill-requested',
    status: 'draft',
    orderIds: ['ord-1'],
    checkoutRequestedAt: new Date().toISOString(),
    checkoutApprovedAt: null,
    checkoutRequestMethod: 'cash',
    createdAt: new Date().toISOString(),
  }
  const service = makeService({
    orderList: [{ id: 'ord-1', branchId: BRANCH, tableId: TABLE, status: 'ready' }],
    billList: [requestedBill],
    tables: { findTableByToken: async (token) => token === 'tok-1' ? table : null },
  })
  const bill = await service.requestPublicBill('tok-1')
  assert.equal(bill.id, 'bill-requested')
  assert.ok(bill.checkoutRequestedAt)
  assert.equal(bill.checkoutApprovedAt, null)
  // Items are shown so the customer sees their total while waiting for the cashier
  assert.equal(bill.items.length, 1)
})

test('requestPublicBill does not re-bill orders already included in a previous bill', async () => {
  const table = { id: TABLE, branchId: BRANCH, qrToken: 'tok-1' }
  const billedOrderId = 'ord-1'
  const newOrderId = 'ord-2'
  const service = makeService({
    orderList: [
      { id: billedOrderId, branchId: BRANCH, tableId: TABLE, status: 'completed' },
      { id: newOrderId, branchId: BRANCH, tableId: TABLE, status: 'ready' },
    ],
    orderItemList: [
      { id: 'oi-1', orderId: billedOrderId, branchId: BRANCH, unitPrice: 100, quantity: 2 },
      { id: 'oi-2', orderId: newOrderId, branchId: BRANCH, unitPrice: 50, quantity: 1 },
    ],
    billList: [{ ...sampleBill, status: 'finalized', immutableAt: new Date().toISOString(), orderIds: [billedOrderId], checkoutApprovedAt: new Date().toISOString() }],
    tables: { findTableByToken: async (token) => token === 'tok-1' ? table : null },
  })
  const bill = await service.requestPublicBill('tok-1')
  // Only the new, unbilled order should be on the new bill — the table is effectively vacant for the previous guest
  assert.deepEqual(bill.orderIds, [newOrderId])
  assert.equal(bill.items.length, 1)
  assert.equal(bill.items[0].orderId, newOrderId)
})
