const crypto = require('crypto')
const userModel = require('../models/userModel')
const sessionModel = require('../models/sessionModel')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

function verifyPassword(password, storedHash) {
  const [salt, expectedKey] = String(storedHash ?? '').split(':')
  if (!salt || !expectedKey) return false
  const actualKey = crypto.scryptSync(password, salt, 64)
  const expectedBuffer = Buffer.from(expectedKey, 'hex')
  return (
    actualKey.length === expectedBuffer.length && crypto.timingSafeEqual(actualKey, expectedBuffer)
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateRegistration(input) {
  const errors = {}
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  const email = String(input.email ?? '').trim()
  const password = String(input.password ?? '')

  if (!firstName) errors.firstName = 'First name is required.'
  else if (firstName.length > 60) errors.firstName = 'First name must be 60 characters or fewer.'

  if (!lastName) errors.lastName = 'Last name is required.'
  else if (lastName.length > 60) errors.lastName = 'Last name must be 60 characters or fewer.'

  if (!email) errors.email = 'Email is required.'
  else if (email.length > 255) errors.email = 'Email must be 255 characters or fewer.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Please enter a valid email address.'

  if (!password) errors.password = 'Password is required.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (password.length > 100) errors.password = 'Password must be 100 characters or fewer.'
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must contain at least one letter and one number.'
  }

  return { errors, firstName, lastName, email, password }
}

function validationFailure(errors, status = 400) {
  const error = new Error('Validation failed')
  error.status = status
  error.details = errors
  return error
}

async function registerUser(input) {
  const { errors, firstName, lastName, email, password } = validateRegistration(input)

  if (Object.keys(errors).length > 0) {
    throw validationFailure(errors)
  }

  const existing = await userModel.findByEmail(email)
  if (existing) {
    throw validationFailure(
      { email: 'An account with this email already exists. Try logging in instead.' },
      409,
    )
  }

  const user = await userModel.create({
    email,
    fullName: `${firstName} ${lastName}`,
    passwordHash: hashPassword(password),
  })

  const session = await sessionModel.create(user.id)
  return { user, sessionId: session.id }
}

async function loginUser({ email, password } = {}) {
  const errors = {}
  const cleanEmail = String(email ?? '').trim()
  const cleanPassword = String(password ?? '')

  if (!cleanEmail) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = 'Please enter a valid email address.'

  if (!cleanPassword) errors.password = 'Password is required.'

  if (Object.keys(errors).length > 0) {
    throw validationFailure(errors)
  }

  const record = await userModel.findByEmail(cleanEmail)
  if (!record || !verifyPassword(cleanPassword, record.password_hash)) {
    const authError = new Error('Invalid email or password.')
    authError.status = 401
    throw authError
  }

  const user = {
    id: record.id,
    email: record.email,
    fullName: record.full_name,
    role: record.role,
    createdAt: record.created_at,
  }
  const session = await sessionModel.create(record.id)
  return { user, sessionId: session.id }
}

async function logoutUser(sessionId) {
  if (!sessionId) return false
  return sessionModel.deleteById(sessionId)
}

async function getUserForSession(sessionId) {
  const session = await sessionModel.findValidById(sessionId)
  if (!session) return null
  return userModel.findById(session.userId)
}

module.exports = { registerUser, loginUser, logoutUser, getUserForSession }
