const authService = require('../services/authService')
const projectService = require('../services/projectService')
const ratingModel = require('../models/ratingModel')

async function syncUser(req, res, next) {
  try {
    const user = await authService.syncUser(req.firebaseUid, req.firebaseEmail, req.body)
    res.json({ data: { user } })
  } catch (error) {
    next(error)
  }
}

async function me(req, res, next) {
  try {
    if (req.firebaseUid && !req.user) {
      const user = await authService.ensureUserFromToken(req.firebaseUid, req.firebaseEmail)
      res.json({ data: { user } })
      return
    }
    res.json({ data: { user: req.user ?? null } })
  } catch (error) {
    next(error)
  }
}

async function getProfile(req, res, next) {
  try {
    res.json({ data: { user: req.user } })
  } catch (error) {
    next(error)
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateUserProfile(req.user.id, req.body)
    res.json({ data: { user } })
  } catch (error) {
    next(error)
  }
}

async function updatePreferences(req, res, next) {
  try {
    const user = await authService.updateUserInterests(req.user.id, req.body?.interests)
    res.json({ data: { user } })
  } catch (error) {
    next(error)
  }
}

async function getMyProjects(req, res, next) {
  try {
    const [created, joined] = await Promise.all([
      projectService.getProjectsCreatedBy(req.user.id),
      projectService.getProjectsJoinedBy(req.user.id),
    ])
    res.json({ data: { created, joined } })
  } catch (error) {
    next(error)
  }
}

async function getMyRatings(req, res, next) {
  try {
    const ratings = await ratingModel.findByUser(req.user.id)
    res.json({ data: ratings })
  } catch (error) {
    next(error)
  }
}

module.exports = { syncUser, me, getProfile, updateProfile, updatePreferences, getMyProjects, getMyRatings }
