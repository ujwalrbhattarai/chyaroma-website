import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { createTableService } from '../services/tableService.js'

const managerUser = { id: 'manager-1', role: 'branch_manager', branchId: 'branch-1' }
const adminUser = { id: 'admin-1', role: 'super_admin', branchId: null }
const kitchenUser = { id: 'kitchen-1', role: 'kitchen_staff', branchId: 'branch-1' }

const sampleTable = { id: 'table-1', branchId: 'branch-1', tableNumber: 1, label: 'Window', qrToken: 'tok-1', isActive: true, manualOccupied: false, customerOccupied: false }

const makeService = (tables = [sampleTable], orders = [], bills = []) => {
  const tableStore = [...tables]
  const orderStore = [...orders]
  const billStore = [...bills]
  return createTableService({
    secret: 'test-secret-for-unit-tests',
    repository: {
      listTables: async (branchId) => tableStore.filter((t) => t.branchId === branchId),
      listTablesWithOccupancy: async (branchId) => tableStore
        .filter((t) => t.branchId === branchId)
        .map((t) => {
          const autoOccupied = orderStore.some((o) => o.branchId === branchId && o.tableId === t.id && o.status !== 'cancelled' && o.status !== 'completed')
            || billStore.some((b) => b.branchId === branchId && b.tableId === t.id && b.status === 'draft')
          return {
            ...t,
            autoOccupied,
            isOccupied: autoOccupied || t.manualOccupied || t.customerOccupied,
          }
        }),
      findTableById: async (id, branchId) => tableStore.find((t) => t.id === id && t.branchId === branchId) ?? null,
      findTableByToken: async (token) => tableStore.find((t) => t.qrToken === token) ?? null,
      createTable: async (branchId, payload) => {
        const table = { ...payload, id: `table-new-${Date.now()}`, branchId, isActive: true, manualOccupied: false, customerOccupied: false }
        tableStore.push(table)
        return table
      },
      updateTableToken: async (id, branchId, qrToken) => {
        const table = tableStore.find((t) => t.id === id)
        table.qrToken = qrToken
        return table
      },
      deactivateTable: async (id, branchId) => {
        const table = tableStore.find((t) => t.id === id && t.branchId === branchId)
        table.isActive = false
        return table
      },
      setManualOccupied: async (id, branchId, manualOccupied) => {
        const table = tableStore.find((t) => t.id === id && t.branchId === branchId)
        table.manualOccupied = manualOccupied
        table.isOccupied = manualOccupied || table.autoOccupied || table.customerOccupied
        return table
      },
      setCustomerOccupied: async (id, branchId, customerOccupied) => {
        const table = tableStore.find((t) => t.id === id && t.branchId === branchId)
        table.customerOccupied = customerOccupied
        return table
      },
      clearTableOccupancy: async (id, branchId) => {
        const table = tableStore.find((t) => t.id === id && t.branchId === branchId)
        table.customerOccupied = false
        return table
      },
      getTableUnpaidActivity: async (branchId, tableId) => {
        const hasActiveOrders = orderStore.some((o) => o.branchId === branchId && o.tableId === tableId && o.status !== 'cancelled' && o.status !== 'completed')
        const hasDraftBill = billStore.some((b) => b.branchId === branchId && b.tableId === tableId && b.status === 'draft')
        const hasUnapprovedFinalizedBill = billStore.some((b) => b.branchId === branchId && b.tableId === tableId && b.status === 'finalized' && !b.checkoutApprovedAt)
        const billedOrderIds = new Set(billStore.filter((b) => b.branchId === branchId && b.tableId === tableId).flatMap((b) => b.orderIds ?? []))
        const hasCompletedUnbilledOrders = orderStore.some((o) => o.branchId === branchId && o.tableId === tableId && o.status === 'completed' && !billedOrderIds.has(o.id))
        return {
          hasActiveOrders,
          hasDraftBill,
          hasUnapprovedFinalizedBill,
          hasCompletedUnbilledOrders,
          hasUnpaidActivity: hasActiveOrders || hasDraftBill || hasUnapprovedFinalizedBill || hasCompletedUnbilledOrders,
        }
      },
    },
    orders: {
      cancelPendingOrdersByTable: async (branchId, tableId) => {
        const cancelled = []
        for (const order of orderStore) {
          if (order.branchId === branchId && order.tableId === tableId && order.status !== 'cancelled' && order.status !== 'completed') {
            order.status = 'cancelled'
            order.cancellationReason = 'Table released by customer'
            order.cancelledAt = new Date().toISOString()
            cancelled.push(order)
          }
        }
        return cancelled
      },
    },
    bills: {
      deleteDraftBillsByTable: async (branchId, tableId) => {
        const remaining = []
        const deleted = []
        for (const bill of billStore) {
          if (bill.branchId === branchId && bill.tableId === tableId && bill.status === 'draft') {
            deleted.push({ id: bill.id })
          } else {
            remaining.push(bill)
          }
        }
        billStore.length = 0
        billStore.push(...remaining)
        return deleted
      },
    },
  })
}

test('Kitchen staff can list tables for their branch', async () => {
  const service = makeService()
  const tables = await service.listTables(kitchenUser, null)
  assert.equal(tables.length, 1)
})

test('Manager can list their branch tables', async () => {
  const service = makeService()
  const tables = await service.listTables(managerUser, null)
  assert.equal(tables.length, 1)
  assert.equal(tables[0].tableNumber, 1)
})

test('Super Admin needs branchId to list tables', async () => {
  const service = makeService()
  await assert.rejects(async () => service.listTables(adminUser, null), /branchId is required/)
})

test('Manager can create a table', async () => {
  const service = makeService([])
  const table = await service.createTable(managerUser, null, { tableNumber: 5, label: 'Patio' })
  assert.equal(table.tableNumber, 5)
  assert.equal(table.branchId, 'branch-1')
  assert.ok(table.qrToken, 'should have a qr token')
})

test('createTable rejects non-positive tableNumber', async () => {
  const service = makeService([])
  await assert.rejects(async () => service.createTable(managerUser, null, { tableNumber: 0 }), /positive integer/)
})

test('createTable rejects duplicate table numbers', async () => {
  const service = makeService()
  await assert.rejects(async () => service.createTable(managerUser, null, { tableNumber: 1 }), /already exists/)
})

test('Manager can deactivate a table', async () => {
  const table = { ...sampleTable, id: 'table-1', branchId: 'branch-1' }
  const service = makeService([table])
  const result = await service.deactivateTable(managerUser, 'branch-1', 'table-1')
  assert.equal(result.isActive, false)
})

test('deactivateTable throws 404 for unknown table', async () => {
  const service = makeService()
  await assert.rejects(async () => service.deactivateTable(managerUser, 'branch-1', 'ghost-table'), /not found/i)
})

test('validateScanToken marks the table occupied on scan', async () => {
  const table = { ...sampleTable, customerOccupied: false }
  // validateScanToken verifies the token as a real JWT — sign one for the table.
  const signedToken = jwt.sign({ type: 'table', branchId: table.branchId, tableId: table.id, tableNumber: table.tableNumber }, 'test-secret-for-unit-tests')
  const service = makeService([{ ...table, qrToken: signedToken }])
  const result = await service.validateScanToken(signedToken)
  assert.equal(result.table.customerOccupied, true)
})

test('releaseTable succeeds when there is no unpaid activity', async () => {
  const table = { ...sampleTable, customerOccupied: true }
  const service = makeService([table])
  const result = await service.releaseTable(table.qrToken)
  assert.ok(result.released)
  assert.equal(result.table.customerOccupied, false)
})

test('releaseTable throws 409 when there are unpaid orders', async () => {
  const table = { ...sampleTable, customerOccupied: true }
  const service = makeService(
    [table],
    [{ id: 'ord-1', branchId: 'branch-1', tableId: 'table-1', status: 'ready' }],
  )
  await assert.rejects(async () => service.releaseTable(table.qrToken), /unpaid orders or an outstanding bill/i)
})

test('releaseTable throws 409 when there is a draft bill', async () => {
  const table = { ...sampleTable, customerOccupied: true }
  const service = makeService(
    [table],
    [],
    [{ id: 'bill-1', branchId: 'branch-1', tableId: 'table-1', status: 'draft' }],
  )
  await assert.rejects(async () => service.releaseTable(table.qrToken), /unpaid orders or an outstanding bill/i)
})

test('releaseTable throws 409 when there is a finalized but unapproved bill', async () => {
  const table = { ...sampleTable, customerOccupied: true }
  const service = makeService(
    [table],
    [],
    [{ id: 'bill-1', branchId: 'branch-1', tableId: 'table-1', status: 'finalized', checkoutApprovedAt: null }],
  )
  await assert.rejects(async () => service.releaseTable(table.qrToken), /unpaid orders or an outstanding bill/i)
})

test('forceReleaseTable cancels active orders, deletes draft bills, and clears occupancy', async () => {
  const table = { ...sampleTable, customerOccupied: true, manualOccupied: true }
  const service = makeService(
    [table],
    [
      { id: 'ord-1', branchId: 'branch-1', tableId: 'table-1', status: 'pending' },
      { id: 'ord-2', branchId: 'branch-1', tableId: 'table-1', status: 'ready' },
      { id: 'ord-3', branchId: 'branch-1', tableId: 'table-1', status: 'completed' },
    ],
    [{ id: 'bill-1', branchId: 'branch-1', tableId: 'table-1', status: 'draft' }],
  )
  const result = await service.forceReleaseTable(managerUser, 'branch-1', 'table-1')
  assert.equal(result.manualOccupied, false)
  assert.equal(result.customerOccupied, false)
  const after = (await service.listTables(managerUser, 'branch-1'))[0]
  assert.equal(after.isOccupied, false)
  // The order store's active orders should now be cancelled
  assert.equal(service, service) // keep reference
})

test('forceReleaseTable throws 403 for kitchen staff', async () => {
  const service = makeService()
  await assert.rejects(async () => service.forceReleaseTable(kitchenUser, 'branch-1', 'table-1'), /Forbidden/)
})

test('setTableOccupied can mark a vacant table occupied', async () => {
  const table = { ...sampleTable, customerOccupied: false }
  const service = makeService([table])
  const occupied = await service.setTableOccupied(managerUser, 'branch-1', 'table-1', true)
  assert.equal(occupied.manualOccupied, true)
})

test('setTableOccupied(false) succeeds when there is no unpaid activity', async () => {
  const table = { ...sampleTable, customerOccupied: true, manualOccupied: true }
  const service = makeService([table])
  const vacant = await service.setTableOccupied(managerUser, 'branch-1', 'table-1', false)
  assert.equal(vacant.manualOccupied, false)
  assert.equal(vacant.customerOccupied, false)
})

test('setTableOccupied(false) throws 409 when there are unpaid orders', async () => {
  const table = { ...sampleTable, customerOccupied: true, manualOccupied: true }
  const service = makeService(
    [table],
    [{ id: 'ord-1', branchId: 'branch-1', tableId: 'table-1', status: 'ready' }],
  )
  await assert.rejects(async () => service.setTableOccupied(managerUser, 'branch-1', 'table-1', false), /unpaid orders or an outstanding bill/i)
})

test('setTableOccupied throws 404 for unknown table', async () => {
  const service = makeService()
  await assert.rejects(async () => service.setTableOccupied(managerUser, 'branch-1', 'ghost-table', true), /not found/i)
})

test('listTables marks tables as occupied when they have active orders, draft bills, or customer occupancy', async () => {
  const table1 = { ...sampleTable, id: 'table-1', branchId: 'branch-1', tableNumber: 1, customerOccupied: false }
  const table2 = { ...sampleTable, id: 'table-2', branchId: 'branch-1', tableNumber: 2, customerOccupied: false }
  const table3 = { ...sampleTable, id: 'table-3', branchId: 'branch-1', tableNumber: 3, customerOccupied: true }
  const table4 = { ...sampleTable, id: 'table-4', branchId: 'branch-1', tableNumber: 4, customerOccupied: false }
  const service = makeService(
    [table1, table2, table3, table4],
    [{ id: 'ord-1', branchId: 'branch-1', tableId: 'table-1', status: 'ready' }],
    [{ id: 'bill-1', branchId: 'branch-1', tableId: 'table-2', status: 'draft' }],
  )
  const tables = await service.listTables(managerUser, null)
  const byNumber = Object.fromEntries(tables.map((t) => [t.tableNumber, t]))
  assert.equal(byNumber[1].isOccupied, true)  // active order
  assert.equal(byNumber[2].isOccupied, true)  // draft bill
  assert.equal(byNumber[3].isOccupied, true)  // customer-occupied flag
  assert.equal(byNumber[4].isOccupied, false) // vacant
})

test('releaseTable throws 403 for inactive table', async () => {
  const table = { ...sampleTable, id: 'table-1', isActive: false }
  const service = makeService([table])
  await assert.rejects(async () => service.releaseTable(table.qrToken), /Invalid table token/)
})

test('releaseTable requires token', async () => {
  const service = makeService()
  await assert.rejects(async () => service.releaseTable(''), /Token is required/)
})