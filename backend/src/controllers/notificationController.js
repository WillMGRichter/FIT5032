const notificationService = require('../services/notificationService')

async function getNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getNotifications(req.user.id)
    res.json({ data: notifications })
  } catch (error) {
    next(error)
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const result = await notificationService.getUnreadCount(req.user.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await notificationService.markAsRead(Number(req.params.id), req.user.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

async function deleteNotification(req, res, next) {
  try {
    const result = await notificationService.deleteNotification(Number(req.params.id), req.user.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
}
