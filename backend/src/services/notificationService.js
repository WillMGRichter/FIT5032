const notificationModel = require('../models/notificationModel')

async function getNotifications(userId) {
  return notificationModel.findByUser(userId)
}

async function getUnreadCount(userId) {
  const count = await notificationModel.countUnread(userId)
  return { count }
}

async function markAsRead(id, userId) {
  const updated = await notificationModel.markAsRead(id, userId)
  if (!updated) {
    const error = new Error('Notification not found')
    error.status = 404
    throw error
  }
  return { success: true }
}

async function markAllAsRead(userId) {
  const updated = await notificationModel.markAllAsRead(userId)
  return { updated }
}

async function deleteNotification(id, userId) {
  const deleted = await notificationModel.deleteById(id, userId)
  if (!deleted) {
    const error = new Error('Notification not found')
    error.status = 404
    throw error
  }
  return { success: true }
}

async function createNotification(userId, title, message, link) {
  return notificationModel.create({ userId, title, message, link })
}

async function createManyNotifications(items) {
  return notificationModel.createMany(items)
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createManyNotifications,
}
