import { EventEmitter } from 'node:events'
import * as billRepository from '../repositories/billRepository.js'
import * as orderRepository from '../repositories/orderRepository.js'
import * as orderItemRepository from '../repositories/orderItemRepository.js'
import * as paymentRepository from '../repositories/paymentRepository.js'
import * as settingsRepository from '../repositories/settingsRepository.js'
import * as tableRepository from '../repositories/tableRepository.js'
import * as deviceRepository from '../repositories/deviceRepository.js'
import { deductInventoryForOrder } from './inventoryDeduction.js'

const billingError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const billingEvents = new EventEmitter()

function calculateTax(subtotal, taxRate) { return Number((subtotal * (Number(taxRate) / 100)).toFixed(2)) }

export function createBillingService({ bills = billRepository, orders = orderRepository, orderItems = orderItemRepository, payments = paymentRepository, settings = settingsRepository, tables = tableRepository, devices = deviceRepository, deduct = (branchId, orderId) => deductInventoryForOrder(branchId, orderId) } = {}) {
  return {
    async requestPublicBill(tableToken, deviceId) {
      if (!tableToken) throw billingError('Table token is required', 400)
      const table = await tables.findTableByToken(tableToken)
      if (!table) throw billingError('Invalid table token', 403)
      // Privacy/safety: a customer may only see this table's bill if their device has an
      // open tab here. Otherwise a stranger re-scanning the table would inherit the
      // previous guest's unpaid bill (cross-phone scam).
      if (deviceId) {
        const owned = await devices.deviceHasOpenTabOnTable(deviceId, table.id)
        if (!owned) throw billingError('No billable orders found', 404)
      }
      const bill = await this.syncDraftBill(table.branchId, table.id)
      if (bill) return bill
      // All orders are already billed. If a checkout is pending (requested but not yet
      // approved), return the bill WITH its items so the customer still sees their total
      // while the cashier approves the payment — only show "thank you" AFTER approval.
      const latestBill = (await bills.listBillsByTable(table.branchId, table.id))[0]
      if (latestBill && latestBill.checkoutRequestedAt && !latestBill.checkoutApprovedAt) {
        const items = []
        for (const orderId of latestBill.orderIds ?? []) items.push(...await orderItems.listOrderItems(orderId, table.branchId))
        return { ...latestBill, items }
      }
      const approvedBill = await bills.findLatestApprovedBillByTable(table.branchId, table.id)
      if (approvedBill) return { ...approvedBill, items: [] }
      throw billingError('No billable orders found', 404)
    },
    async generateBill(branchId, tableId) {
      const bill = await this.syncDraftBill(branchId, tableId)
      if (!bill) throw billingError('No billable orders found', 404)
      return bill
    },
    async syncDraftBill(branchId, tableId) {
      const billedOrderIds = new Set(await bills.listBilledOrderIdsByTable(branchId, tableId))
      const tableOrders = (await orders.listOrdersReadyForBilling(branchId, tableId)).filter((order) => !billedOrderIds.has(order.id))
      const existingDraft = await bills.findDraftBillByTable(branchId, tableId)
      if (tableOrders.length === 0) {
        // A draft bill already captured this table's orders (from a prior bill-page visit
        // or a staff preview). Return it (with items) so the customer can still see and pay
        // it — otherwise they hit "No active orders" and leave unpaid. If there is no draft
        // either, there is genuinely nothing to bill yet.
        if (existingDraft) {
          if (Number(existingDraft.totalAmount) < 0) throw billingError('Invalid bill amount', 409)
          const draftItems = []
          for (const orderId of existingDraft.orderIds ?? []) draftItems.push(...await orderItems.listOrderItems(orderId, branchId))
          return { ...existingDraft, items: draftItems }
        }
        return null
      }
      const billableItems = []
      for (const order of tableOrders) billableItems.push(...await orderItems.listOrderItems(order.id, branchId))
      const subtotal = Number(billableItems.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0).toFixed(2))
      // Defense in depth: never produce a negative/zero-total bill (a sign-drained or
      // tampered order must fail closed rather than hand the cashier a loss).
      if (subtotal < 0) throw billingError('Invalid bill amount', 400)
      const branchSettings = await settings.findSettingsByBranch(branchId)
      const taxRate = branchSettings?.taxRate ?? 0
      const taxAmount = calculateTax(subtotal, taxRate)
      const discountAmount = 0
      const totalAmount = Number((subtotal + taxAmount - discountAmount).toFixed(2))
      const payload = {
        branchId,
        tableId,
        orderIds: tableOrders.map((order) => order.id),
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        totalAmount,
        paymentMethod: existingDraft?.paymentMethod ?? null,
      }
      let updatedBill
      if (existingDraft) {
        updatedBill = await bills.updateBill(existingDraft.id, branchId, payload)
      } else {
        updatedBill = await bills.createBill(payload)
      }
      const result = { ...updatedBill, items: billableItems }
      billingEvents.emit('bill-updated', { branchId, bill: result })
      return result
    },
    async addAdjustment(branchId, originalBillId, payload) {
      const original = await bills.findBillById(originalBillId, branchId)
      if (!original) throw billingError('Original bill not found', 404)
      if (original.status !== 'finalized' && original.status !== 'adjustment') throw billingError('Bill is not finalized')
      return bills.createBill({ branchId, tableId: original.tableId, orderIds: original.orderIds, subtotal: payload.subtotal ?? original.subtotal, taxRate: payload.taxRate ?? original.taxRate, taxAmount: payload.taxAmount ?? original.taxAmount, discountAmount: payload.discountAmount ?? original.discountAmount, totalAmount: payload.totalAmount ?? original.totalAmount, paymentMethod: payload.paymentMethod ?? original.paymentMethod, adjustmentOfBillId: original.id, status: 'adjustment', immutableAt: new Date().toISOString() })
    },
    async finalizeBill(branchId, billId) { const bill = await bills.findBillById(billId, branchId); if (!bill) throw billingError('Bill not found', 404); return bills.finalizeBill(billId, branchId) },
    async checkoutPublicBill(tableToken, billId, method = 'cash', deviceId) {
      if (!tableToken) throw billingError('Table token is required', 400)
      const table = await tables.findTableByToken(tableToken)
      if (!table) throw billingError('Invalid table token', 403)
      const bill = await bills.findBillById(billId, table.branchId)
      if (!bill || bill.tableId !== table.id) throw billingError('Bill not found', 404)
      // Only the device that actually placed the order on this table may request the
      // checkout — prevent a stranger from touching a previous guest's unpaid bill.
      if (deviceId) {
        const owned = await devices.deviceHasOpenTabOnTable(deviceId, table.id)
        if (!owned) throw billingError('You can only check out a bill for an order placed on this device', 403)
      }
      if (bill.checkoutApprovedAt) throw billingError('Checkout has already been approved', 409)
      const loadItems = async () => {
        const items = []
        for (const orderId of bill.orderIds ?? []) items.push(...await orderItems.listOrderItems(orderId, table.branchId))
        return items
      }
      if (bill.checkoutRequestedAt) {
        return { ...bill, items: await loadItems() }
      }
      const updated = await bills.updateBill(billId, table.branchId, { checkoutRequestedAt: new Date().toISOString(), checkoutRequestMethod: method })
      const result = { ...updated, items: await loadItems() }
      billingEvents.emit('bill-updated', { branchId: table.branchId, bill: result })
      return result
    },
    async approveCheckout(branchId, billId, method = 'cash', cashierId = null) {
      // Super admin has branchId null; look up the bill across branches so they can approve any branch's checkout.
      const bill = branchId ? await bills.findBillById(billId, branchId) : await bills.findBillByIdAcrossBranches(billId)
      if (!bill) throw billingError('Bill not found', 404)
      if (!bill.checkoutRequestedAt) throw billingError('Checkout has not been requested', 400)
      if (bill.checkoutApprovedAt) throw billingError('Checkout already approved', 409)
      const billBranchId = bill.branchId
      const approvedAt = new Date().toISOString()
      let approvedBill = bill
      if (bill.status !== 'finalized') {
        await payments.createPayment({ billId, branchId: billBranchId, amount: bill.totalAmount, method, processedBy: cashierId })
        await bills.updateBillAttempt(billId, billBranchId, { paymentMethod: method, cashierId })
        approvedBill = await bills.finalizeBillWithApproval(billId, billBranchId, approvedAt, cashierId)
      } else {
        approvedBill = await bills.markBillCheckoutApproved(billId, billBranchId, approvedAt, cashierId)
      }
      // Complete outstanding orders for the table. Inventory deduction is handled
      // exclusively upon order status transition, not duplicated by billing.
      await orders.completeTableOrders(billBranchId, bill.tableId)
      // Remove any leftover draft bills for this table so the table is vacant for the next customer.
      await bills.deleteDraftBillsByTable(billBranchId, bill.tableId)
      // Hide this table's order history from the customer so the next guest
      // cannot see the previous customer's private order details.
      if (orders.hideTableOrdersFromCustomer) {
        await orders.hideTableOrdersFromCustomer(billBranchId, bill.tableId)
      }
      // Payment approved — clear the customer-occupied flag so the table becomes vacant automatically.
      if (tables.clearTableOccupancy) {
        await tables.clearTableOccupancy(bill.tableId, billBranchId)
      }
      const result = { ...approvedBill, items: [] }
      billingEvents.emit('bill-updated', { branchId: billBranchId, bill: result })
      return result
    },
    async completeCashPayment(branchId, billId, cashierId = null) {
      const bill = branchId ? await bills.findBillById(billId, branchId) : await bills.findBillByIdAcrossBranches(billId)
      if (!bill) throw billingError('Bill not found', 404)
      if (bill.checkoutApprovedAt) throw billingError('Payment has already been completed', 409)
      const billBranchId = bill.branchId
      const approvedAt = new Date().toISOString()
      await payments.createPayment({ billId, branchId: billBranchId, amount: bill.totalAmount, method: 'cash', processedBy: cashierId })
      await bills.updateBillAttempt(billId, billBranchId, { paymentMethod: 'cash', cashierId })
      let approvedBill
      if (bill.status !== 'finalized') {
        approvedBill = await bills.finalizeBillWithApproval(billId, billBranchId, approvedAt, cashierId)
      } else {
        approvedBill = await bills.markBillCheckoutApproved(billId, billBranchId, approvedAt, cashierId)
      }
      await orders.completeTableOrders(billBranchId, bill.tableId)
      await bills.deleteDraftBillsByTable(billBranchId, bill.tableId)
      if (orders.hideTableOrdersFromCustomer) {
        await orders.hideTableOrdersFromCustomer(billBranchId, bill.tableId)
      }
      if (tables.clearTableOccupancy) {
        await tables.clearTableOccupancy(bill.tableId, billBranchId)
      }
      const result = { ...approvedBill, items: [] }
      billingEvents.emit('bill-updated', { branchId: billBranchId, bill: result })
      return result
    },
    async getTableBillByNumber(branchId, tableNumber) {
      if (!branchId) throw billingError('Branch ID is required', 400)
      if (!tableNumber && tableNumber !== 0) throw billingError('Table number is required', 400)
      const num = parseInt(tableNumber, 10)
      if (Number.isNaN(num) || num <= 0) throw billingError('Invalid table number', 400)
      const table = await tables.findTableByNumber(branchId, num)
      if (!table) throw billingError(`Table ${num} not found in this branch`, 404)

      let bill = await this.syncDraftBill(branchId, table.id)
      if (!bill) {
        const tableBills = await bills.listBillsByTable(branchId, table.id)
        const pending = tableBills.find((b) => b.checkoutRequestedAt && !b.checkoutApprovedAt)
        const latest = tableBills[0]
        bill = pending || latest || null
        if (bill) {
          const items = []
          for (const orderId of bill.orderIds ?? []) {
            items.push(...await orderItems.listOrderItems(orderId, branchId))
          }
          bill = { ...bill, items }
        }
      }
      if (!bill) throw billingError(`No active orders or bills found for Table ${num}`, 404)
      return {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          label: table.label,
        },
        bill,
      }
    },
    async listBranchBills(branchId) {
      return bills.listBillsByBranch(branchId)
    },
    async mutateBillAttempt(branchId, billId, payload) {
      const bill = await bills.findBillById(billId, branchId)
      if (!bill) throw billingError('Bill not found', 404)
      if (bill.status === 'finalized' && bill.immutableAt) throw billingError('Finalized bills are immutable', 409)
      return bills.updateBillAttempt(billId, branchId, payload)
    },
    async recordPayment(branchId, billId, amount, method) {
      const bill = await bills.findBillById(billId, branchId)
      if (!bill) throw billingError('Bill not found', 404)
      if (bill.status === 'finalized' && bill.immutableAt) throw billingError('Finalized bills are immutable', 409)
      await payments.createPayment({ billId, branchId, amount, method })
      await bills.updateBillAttempt(billId, branchId, { paymentMethod: method })
      const finalized = await bills.finalizeBill(billId, branchId)
      // Hide this table's order history from the customer so the next guest
      // cannot see the previous customer's private order details.
      if (orders.hideTableOrdersFromCustomer) {
        await orders.hideTableOrdersFromCustomer(branchId, bill.tableId)
      }
      // Payment recorded — clear the customer-occupied flag so the table becomes vacant.
      if (tables.clearTableOccupancy) {
        await tables.clearTableOccupancy(bill.tableId, branchId)
      }
      return finalized
    },
  }
}

const service = createBillingService()
export const requestPublicBill = (...args) => service.requestPublicBill(...args)
export const generateBill = (...args) => service.generateBill(...args)
export const syncDraftBill = (...args) => service.syncDraftBill(...args)
export const checkoutPublicBill = (...args) => service.checkoutPublicBill(...args)
export const approveCheckout = (...args) => service.approveCheckout(...args)
export const completeCashPayment = (...args) => service.completeCashPayment(...args)
export const getTableBillByNumber = (...args) => service.getTableBillByNumber(...args)
export const listBranchBills = (...args) => service.listBranchBills(...args)
export const addAdjustment = (...args) => service.addAdjustment(...args)
export const finalizeBill = (...args) => service.finalizeBill(...args)
export const mutateBillAttempt = (...args) => service.mutateBillAttempt(...args)
export const recordPayment = (...args) => service.recordPayment(...args)
export { billingEvents }