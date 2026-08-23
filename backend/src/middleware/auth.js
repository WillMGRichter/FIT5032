const sessionModel = require('../models/sessionModel')
const authService = require('../services/authService')

const SESSION_COOKIE = 'gl_session'

function parseCookies(req) {
  const header = req.headers.cookie
  const cookies = {}
  if (!header) return cookies
  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex === -1) continue
    const key = part.slice(0, separatorIndex).trim()
    const value = part.slice(separatorIndex + 1).trim()
    cookies[key] = decodeURIComponent(value)
  }
  return cookies
}

function setSessionCookie(res, sessionId) {
  const maxAgeSeconds = sessionModel.SESSION_DURATION_DAYS * 24 * 60 * 60
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
  )
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

async function attachUser(req, res, next) {
  try {
    const sessionId = parseCookies(req)[SESSION_COOKIE]
    req.sessionId = sessionId ?? null

    if (sessionId) {
      req.user = await authService.getUserForSession(sessionId)
    }
    next()
  } catch (error) {
    next(error)
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' })
  }
  next()
}

module.exports = { SESSION_COOKIE, setSessionCookie, clearSessionCookie, attachUser, requireAuth }
