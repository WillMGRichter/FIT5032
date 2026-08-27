import { apiRequest } from './api.js'

export async function getNotifications() {
  return apiRequest('/api/notifications')
}

export async function getUnreadCount() {
  return apiRequest('/api/notifications/unread-count')
}

export async function markAsRead(id) {
  return apiRequest(`/api/notifications/${id}/read`, { method: 'POST' })
}

export async function markAllAsRead() {
  return apiRequest('/api/notifications/read-all', { method: 'POST' })
}

export async function deleteNotification(id) {
  return apiRequest(`/api/notifications/${id}`, { method: 'DELETE' })
}
