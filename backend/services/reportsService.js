import * as reportsRepository from '../repositories/reportsRepository.js'
import * as inventoryRepository from '../repositories/inventoryRepository.js'

const reportsError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

function toDayKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function createReportsService({ reports = reportsRepository, inventory = inventoryRepository } = {}) {
  return {
    async overview(branchId) {
      const today = toDayKey(new Date())
      const [todayBills, topToday, activeOrders, allBills] = await Promise.all([
        reports.approvedBills({ branchId, from: today, to: today }),
        reports.topItems({ branchId, from: today, to: today, limit: 5 }),
        reports.activeOrdersCount(branchId),
        reports.approvedBills({ branchId }),
      ])
      const revenueToday = todayBills.reduce((s, b) => s + b.total, 0)
      const customersToday = todayBills.length
      const completedToday = (await reports.completedOrders({ branchId, from: today, to: today })).length
      const totalRevenue = allBills.reduce((s, b) => s + b.total, 0)
      const lowStock = branchId ? (await inventory.listLowStockIngredients(branchId)).length : 0
      return {
        revenueToday: round2(revenueToday),
        customersToday,
        ordersToday: completedToday,
        avgPerCustomerToday: customersToday ? round2(revenueToday / customersToday) : 0,
        totalRevenue: round2(totalRevenue),
        activeOrders,
        lowStock,
        topItemsToday: topToday,
      }
    },
    async report(branchId, { from, to }) {
      if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw reportsError('Invalid "from" date')
      if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw reportsError('Invalid "to" date')
      if (from && to && from > to) throw reportsError('"from" must be on or before "to"')
      const [bills, completed, topItems, statusCounts] = await Promise.all([
        reports.approvedBills({ branchId, from, to }),
        reports.completedOrders({ branchId, from, to }),
        reports.topItems({ branchId, from, to, limit: 8 }),
        reports.orderStatusCounts({ branchId, from, to }),
      ])
      const revenue = bills.reduce((s, b) => s + b.total, 0)
      const customerCount = bills.length
      const revenueByDay = {}
      const customersByDay = {}
      const paymentMethods = {}
      for (const b of bills) {
        const day = toDayKey(b.approvedAt || b.createdAt)
        revenueByDay[day] = (revenueByDay[day] || 0) + b.total
        customersByDay[day] = (customersByDay[day] || 0) + 1
        const m = b.method || 'Unknown'
        paymentMethods[m] = paymentMethods[m] || { count: 0, amount: 0 }
        paymentMethods[m].count += 1
        paymentMethods[m].amount += b.total
      }
      return {
        period: { from, to },
        summary: {
          revenue: round2(revenue),
          customers: customerCount,
          orders: completed.length,
          avgPerCustomer: customerCount ? round2(revenue / customerCount) : 0,
          bills: bills.length,
        },
        revenueByDay,
        customersByDay,
        paymentMethods: Object.entries(paymentMethods).map(([method, v]) => ({ method, count: v.count, amount: round2(v.amount) })),
        topItems,
        statusCounts,
        transactions: bills.map((b) => ({ date: toDayKey(b.approvedAt || b.createdAt), tableId: b.tableId, amount: b.total, method: b.method || 'Unknown' })),
      }
    },
  }
}

const service = createReportsService()
export const overview = (...args) => service.overview(...args)
export const report = (...args) => service.report(...args)
