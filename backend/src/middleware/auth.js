const path = require('path')
const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const userModel = require('../models/userModel')

let firebaseReady = false

function initFirebase() {
  if (firebaseReady) return
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT

  let serviceAccount
  if (serviceAccountJson) {
    try {
      serviceAccount = JSON.parse(serviceAccountJson)
    } catch {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON — Firebase token verification disabled')
      return
    }
  } else if (serviceAccountPath) {
    try {
      serviceAccount = require(path.resolve(serviceAccountPath))
    } catch {
      console.warn('FIREBASE_SERVICE_ACCOUNT file could not be loaded — Firebase token verification disabled')
      return
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_JSON not set — Firebase token verification disabled')
    return
  }

  try {
    initializeApp({ credential: cert(serviceAccount) })
    firebaseReady = true
  } catch {
    console.warn('Firebase app could not be initialized from the service account credential')
  }
}

async function setFirebaseRoleClaim(firebaseUid, role) {
  if (!firebaseUid || !role) return
  if (!firebaseReady) initFirebase()
  if (!firebaseReady) return
  await getAuth().setCustomUserClaims(firebaseUid, { role })
}

async function attachUser(req, res, next) {
  try {
    if (!firebaseReady) initFirebase()

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      try {
        const decoded = await getAuth().verifyIdToken(token)
        req.firebaseUid = decoded.uid
        req.firebaseEmail = decoded.email ?? null
        req.firebaseToken = decoded
        req.user = await userModel.findByFirebaseUid(decoded.uid)
        if (req.user && decoded.role !== req.user.role) {
          req.firebaseToken = { ...decoded, role: req.user.role }
          setFirebaseRoleClaim(decoded.uid, req.user.role).catch(() => {})
        }
      } catch {
        // Token invalid or expired — continue without user
      }
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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' })
    }
    next()
  }
}

module.exports = { attachUser, requireAuth, requireRole, setFirebaseRoleClaim }
