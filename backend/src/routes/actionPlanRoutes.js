const express = require('express')
const actionPlanController = require('../controllers/actionPlanController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/actions', requireAuth, actionPlanController.getAll)
router.post('/actions', requireAuth, actionPlanController.create)
router.post('/actions/suggestions', requireAuth, actionPlanController.suggest)
router.get('/projects/:projectId/actions', requireAuth, actionPlanController.getByProject)
router.patch('/actions/:actionId', requireAuth, actionPlanController.update)
router.patch('/actions/:actionId/toggle', requireAuth, actionPlanController.toggle)
router.delete('/actions/:actionId', requireAuth, actionPlanController.remove)

module.exports = router