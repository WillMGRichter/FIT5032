import { apiRequest } from './api.js'

export async function getMyActions() {
  const data = await apiRequest('/api/auth/me/actions')
  return data ?? []
}

export async function getProjectActions(projectId) {
  return apiRequest(`/api/auth/me/projects/${encodeURIComponent(projectId)}/actions`)
}

export async function createAction(action) {
  return apiRequest('/api/auth/me/actions', { method: 'POST', body: action })
}

export async function generateSuggestions(projectId, templates) {
  return apiRequest('/api/auth/me/actions/suggestions', {
    method: 'POST',
    body: { projectId, templates },
  })
}

export async function updateAction(actionId, updates) {
  return apiRequest(`/api/auth/me/actions/${actionId}`, {
    method: 'PATCH',
    body: updates,
  })
}

export async function toggleAction(actionId) {
  return apiRequest(`/api/auth/me/actions/${actionId}/toggle`, { method: 'PATCH' })
}

export async function deleteAction(actionId) {
  return apiRequest(`/api/auth/me/actions/${actionId}`, { method: 'DELETE' })
}