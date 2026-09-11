/**
 * demoStatsService.js
 *
 * Aggregates demo-only statistics for the Admin/Super Admin Demo Statistics portal.
 * Requires super_admin role — enforced at the route level.
 * Never mixes demo data with real business calculations.
 */

import * as demoStats from '../repositories/demoStatsRepository.js'

const serviceError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

export function createDemoStatsService({ repo = demoStats } = {}) {
  return {
    async getDemoStats(user) {
      if (!user || user.role !== 'super_admin') {
        throw serviceError('Forbidden', 403)
      }

      const [
        statusCounts,
        totalOrders,
        revenue,
        topItems,
        sessions,
        recentOrders,
      ] = await Promise.all([
        repo.demoOrderStatusCounts(),
        repo.demoTotalOrders(),
        repo.demoRevenueStats(),
        repo.demoTopItems(8),
        repo.demoSessionStats(),
        repo.demoRecentOrders(15),
      ])

      return {
        orders: {
          total: totalOrders,
          byStatus: statusCounts,
        },
        revenue,
        topItems,
        sessions,
        recentOrders,
        generatedAt: new Date().toISOString(),
      }
    },
  }
}

const service = createDemoStatsService()
export const getDemoStats = (...args) => service.getDemoStats(...args)
