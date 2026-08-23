const express = require('express')
const authController = require('../controllers/authController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.get('/me', authController.me)
router.get('/profile', requireAuth, authController.getProfile)
router.put('/profile', requireAuth, authController.updateProfile)
router.get('/me/projects', requireAuth, authController.getMyProjects)

module.exports = router
