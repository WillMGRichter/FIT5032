const router = require('express').Router()
const controller = require('../controllers/notificationController')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

router.get('/', controller.getNotifications)
router.get('/unread-count', controller.getUnreadCount)
router.post('/read-all', controller.markAllAsRead)
router.post('/:id/read', controller.markAsRead)
router.delete('/:id', controller.deleteNotification)

module.exports = router
