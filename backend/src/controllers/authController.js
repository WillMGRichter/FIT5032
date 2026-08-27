const authService = require('../services/authService')
const projectService = require('../services/projectService')

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

module.exports = { syncUser, me, getProfile, updateProfile, getMyProjects }
