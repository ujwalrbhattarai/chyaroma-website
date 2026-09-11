import { getDemoStats } from '../services/demoStatsService.js'

export async function getDemoStatsHandler(request, response, next) {
  try {
    const stats = await getDemoStats(request.user)
    response.status(200).json({ stats })
  } catch (error) {
    next(error)
  }
}
