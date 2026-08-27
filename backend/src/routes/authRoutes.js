const express = require('express')
const authController = require('../controllers/authController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/sync', requireAuth, authController.syncUser)
router.get('/me', requireAuth, authController.me)
router.get('/profile', requireAuth, authController.getProfile)
router.put('/profile', requireAuth, authController.updateProfile)
router.get('/me/projects', requireAuth, authController.getMyProjects)

module.exports = router
