import { apiRequest, ApiError } from './api.js'

export async function getPlants(filters = {}) {
  const query = {}
  if (filters.maintenanceLevel) query.maintenanceLevel = filters.maintenanceLevel
  return apiRequest('/api/plants', { query })
}

export async function getPlantById(id) {
  try {
    return await apiRequest(`/api/plants/${encodeURIComponent(id)}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}
