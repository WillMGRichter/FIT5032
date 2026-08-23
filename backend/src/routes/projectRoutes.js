const router = require('express').Router()
const controller = require('../controllers/projectController')

router.get('/', controller.getProjects)
router.post('/', controller.createProject)
router.get('/:id', controller.getProjectById)
router.put('/:id', controller.updateProject)

module.exports = router
