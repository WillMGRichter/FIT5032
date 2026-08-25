const router = require('express').Router()
const controller = require('../controllers/projectController')
const { requireAuth } = require('../middleware/auth')

router.get('/', controller.getProjects)
router.post('/', requireAuth, controller.createProject)
router.get('/:id', controller.getProjectById)
router.put('/:id', requireAuth, controller.updateProject)
router.delete('/:id', requireAuth, controller.deleteProject)

router.get('/:id/participation', requireAuth, controller.getParticipation)
router.post('/:id/participation', requireAuth, controller.joinProject)
router.delete('/:id/participation', requireAuth, controller.leaveProject)
router.get('/:id/plants', controller.getProjectPlants)

module.exports = router
