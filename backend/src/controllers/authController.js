const authService = require('../services/authService')
const projectService = require('../services/projectService')
const { setSessionCookie, clearSessionCookie } = require('../middleware/auth')

async function register(req, res, next) {
  try {
    const { user, sessionId } = await authService.registerUser(req.body)
    setSessionCookie(res, sessionId)
    res.status(201).json({ data: { user } })
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const { user, sessionId } = await authService.loginUser(req.body)
    setSessionCookie(res, sessionId)
    res.json({ data: { user } })
  } catch (error) {
    next(error)
  }
}

async function logout(req, res, next) {
  try {
    await authService.logoutUser(req.sessionId)
    clearSessionCookie(res)
    res.json({ data: { success: true } })
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

module.exports = { register, login, logout, me, getProfile, updateProfile, getMyProjects }
