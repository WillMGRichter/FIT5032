const router = require('express').Router({ mergeParams: true })
const controller = require('../controllers/ratingController')
const { requireAuth } = require('../middleware/auth')

router.get('/', controller.getProjectRatings)
router.post('/', requireAuth, controller.submitRating)
router.put('/:ratingId', requireAuth, controller.updateRating)
router.delete('/:ratingId', requireAuth, controller.deleteRating)

module.exports = router
