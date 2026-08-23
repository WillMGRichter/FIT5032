const router = require('express').Router()
const controller = require('../controllers/projectController')
const { requireAuth } = require('../middleware/auth')

router.get('/', controller.getProjects)
router.post('/', controller.createProject)
router.get('/:id', controller.getProjectById)
router.put('/:id', controller.updateProject)

router.get('/:id/participation', requireAuth, controller.getParticipation)
router.post('/:id/participation', requireAuth, controller.joinProject)
router.delete('/:id/participation', requireAuth, controller.leaveProject)

module.exports = router
