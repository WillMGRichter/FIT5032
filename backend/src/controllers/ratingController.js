const ratingService = require('../services/ratingService')

async function getProjectRatings(req, res, next) {
  try {
    const data = await ratingService.getProjectRatings(req.params.id)
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

async function submitRating(req, res, next) {
  try {
    const data = await ratingService.submitRating(req.params.id, req.user.id, req.body)
    res.status(201).json({ data })
  } catch (error) {
    next(error)
  }
}

async function updateRating(req, res, next) {
  try {
    const data = await ratingService.updateRating(req.params.ratingId, req.user.id, req.body)
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

async function deleteRating(req, res, next) {
  try {
    const data = await ratingService.deleteRating(req.params.ratingId, req.user.id)
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

module.exports = { getProjectRatings, submitRating, updateRating, deleteRating }
