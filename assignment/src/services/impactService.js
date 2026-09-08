import { apiRequest } from './api.js'

export async function getImpactOverview(filters = {}) {
  const query = {}
  if (filters.period && filters.period !== 'all') query.period = filters.period
  if (filters.categoryId) query.categoryId = filters.categoryId
  if (filters.status) query.status = filters.status
  return apiRequest('/api/impact/overview', { query })
}