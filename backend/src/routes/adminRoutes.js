const router = require('express').Router()
const controller = require('../controllers/adminController')
const { requireAuth, requireRole } = require('../middleware/auth')

router.use(requireAuth, requireRole('admin'))

router.get('/users', controller.listUsers)
router.put('/users/:id/role', controller.updateUserRole)
router.delete('/users/:id', controller.deleteUser)
router.get('/stats', controller.getStats)

module.exports = router
