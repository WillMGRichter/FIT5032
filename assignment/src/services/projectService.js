import { apiRequest, ApiError } from './api.js'

export async function getProjects(filters = {}) {
  const query = {}
  if (filters.status) query.status = filters.status
  if (filters.categoryId) query.categoryId = filters.categoryId
  return apiRequest('/api/projects', { query })
}

export async function getProjectById(id) {
  try {
    return await apiRequest(`/api/projects/${encodeURIComponent(id)}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

export async function createProject(project) {
  return apiRequest('/api/projects', { method: 'POST', body: project })
}

export async function updateProject(id, project) {
  return apiRequest(`/api/projects/${id}`, { method: 'PUT', body: project })
}

export async function getParticipation(projectId) {
  return apiRequest(`/api/projects/${projectId}/participation`)
}

export async function getProjectPlants(projectId) {
  return apiRequest(`/api/projects/${projectId}/plants`)
}

export async function joinProject(projectId) {
  return apiRequest(`/api/projects/${projectId}/participation`, { method: 'POST' })
}

export async function leaveProject(projectId) {
  return apiRequest(`/api/projects/${projectId}/participation`, { method: 'DELETE' })
}

export async function deleteProject(id) {
  return apiRequest(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
