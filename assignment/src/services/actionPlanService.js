import { apiRequest } from './api.js'

// Gets the signed-in user's actions.
export async function getMyActions() {
  const data = await apiRequest('/api/auth/me/actions')
  return data ?? []
}

// Gets actions for a project.
export async function getProjectActions(projectId) {
  return apiRequest(`/api/auth/me/projects/${encodeURIComponent(projectId)}/actions`)
}

// Creates an action.
export async function createAction(action) {
  return apiRequest('/api/auth/me/actions', { method: 'POST', body: action })
}

// Requests suggested actions for a project.
export async function generateSuggestions(projectId, templates) {
  return apiRequest('/api/auth/me/actions/suggestions', {
    method: 'POST',
    body: { projectId, templates },
  })
}

// Updates an action.
export async function updateAction(actionId, updates) {
  return apiRequest(`/api/auth/me/actions/${actionId}`, {
    method: 'PATCH',
    body: updates,
  })
}

// Toggles an action's completion state.
export async function toggleAction(actionId) {
  return apiRequest(`/api/auth/me/actions/${actionId}/toggle`, { method: 'PATCH' })
}

// Deletes an action.
export async function deleteAction(actionId) {
  return apiRequest(`/api/auth/me/actions/${actionId}`, { method: 'DELETE' })
}
