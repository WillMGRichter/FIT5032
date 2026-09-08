const router = require('express').Router()
const controller = require('../controllers/impactController')

router.get('/overview', controller.getOverview)

module.exports = router