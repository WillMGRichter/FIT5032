const authService = require('../services/authService')
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
    const { user, sessionId } = await authService.login(req.body)
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

module.exports = { register, login, logout, me }
