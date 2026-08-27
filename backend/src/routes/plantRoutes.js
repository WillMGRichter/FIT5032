const router = require('express').Router()
const controller = require('../controllers/plantController')

router.get('/', controller.getPlants)
router.get('/:id', controller.getPlantById)
router.get('/:id/projects', controller.getProjectsByPlant)

module.exports = router
