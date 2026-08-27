import { apiRequest } from './api'

export async function getUsers() {
  return apiRequest('/api/admin/users')
}

export async function updateUserRole(userId, role) {
  return apiRequest(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    body: { role },
  })
}

export async function deleteUser(userId) {
  return apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' })
}

export async function getStats() {
  return apiRequest('/api/admin/stats')
}
