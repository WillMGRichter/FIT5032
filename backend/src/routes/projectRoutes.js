const router = require('express').Router()
const controller = require('../controllers/projectController')

router.get('/', controller.getProjects)
router.get('/:id', controller.getProjectById)
router.post('/', controller.createProject)

module.exports = router
