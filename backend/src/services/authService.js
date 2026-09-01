const userModel = require('../models/userModel')
const { setFirebaseRoleClaim } = require('../middleware/auth')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function badRequest(message, details = null) {
  const error = new Error(message)
  error.status = 400
  if (details) error.details = details
  return error
}

function validationFailure(errors, status = 400) {
  const error = new Error('Validation failed')
  error.status = status
  error.details = errors
  return error
}

function validateRegistration(input) {
  const errors = {}
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()

  if (!firstName) errors.firstName = 'First name is required.'
  else if (firstName.length > 60) errors.firstName = 'First name must be 60 characters or fewer.'

  if (!lastName) errors.lastName = 'Last name is required.'
  else if (lastName.length > 60) errors.lastName = 'Last name must be 60 characters or fewer.'

  return { errors, firstName, lastName }
}

async function syncUser(firebaseUid, firebaseEmail, input) {
  const { errors, firstName, lastName } = validateRegistration(input)
  if (Object.keys(errors).length > 0) throw validationFailure(errors)

  let user = await userModel.findByFirebaseUid(firebaseUid)

  if (!user) {
    const email = firebaseEmail ?? input.email
    if (!email) {
      throw badRequest('Email is required for new accounts.')
    }

    const existingByEmail = await userModel.findByEmail(email)
    if (existingByEmail) {
      if (existingByEmail.firebaseUid) {
        throw badRequest('An account with this email already exists.')
      }
      const error = new Error('Validation failed')
      error.status = 409
      error.details = { email: 'An account with this email already exists. Please log in with your existing account to link it.' }
      throw error
    }

    user = await userModel.createWithFirebase({ firebaseUid, email, firstName, lastName })
  }

  setFirebaseRoleClaim(firebaseUid, user.role).catch(() => {})

  return user
}

function validateProfileInput(input) {
  const errors = {}
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  const email = String(input.email ?? '').trim()
  const location = String(input.location ?? '').trim()
  const bio = String(input.bio ?? '').trim()
  let { profileImage } = input
  profileImage = String(profileImage ?? '').trim()

  if (!firstName) errors.firstName = 'First name is required.'
  else if (firstName.length > 60) errors.firstName = 'First name must be 60 characters or fewer.'

  if (!lastName) errors.lastName = 'Last name is required.'
  else if (lastName.length > 60) errors.lastName = 'Last name must be 60 characters or fewer.'

  if (!email) errors.email = 'Email is required.'
  else if (email.length > 255) errors.email = 'Email must be 255 characters or fewer.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Please enter a valid email address.'

  if (location.length > 160) errors.location = 'Location must be 160 characters or fewer.'

  if (bio.length > 500) errors.bio = 'Bio must be 500 characters or fewer.'

  if (profileImage) {
    if (!/^https?:\/\//i.test(profileImage)) {
      errors.profileImage = 'Profile image must be a URL starting with http:// or https://'
    } else if (profileImage.length > 500) {
      errors.profileImage = 'Profile image URL must be 500 characters or fewer.'
    }
  }

  return {
    errors,
    values: { firstName, lastName, email, location: location || null, bio: bio || null, profileImage: profileImage || null },
  }
}

async function ensureUserFromToken(firebaseUid, firebaseEmail) {
  let user = await userModel.findByFirebaseUid(firebaseUid)
  if (!user) {
    const email = firebaseEmail
    if (!email) {
      throw badRequest('Email is required for new accounts.')
    }
    const firstName = (firebaseEmail ?? '').split('@')[0] || 'GreenLink'
    const lastName = 'User'
    user = await userModel.createWithFirebase({ firebaseUid, email, firstName, lastName })
  }
  setFirebaseRoleClaim(firebaseUid, user.role).catch(() => {})
  return user
}

async function updateUserProfile(userId, input) {  if (typeof input !== 'object' || input === null) {
    throw badRequest('Request body must be a JSON object')
  }

  const { errors, values } = validateProfileInput(input)

  if (Object.keys(errors).length === 0) {
    const taken = await userModel.emailExistsExcept(values.email, userId)
    if (taken) {
      errors.email = 'An account with this email already exists.'
    }
  }

  if (Object.keys(errors).length > 0) {
    throw validationFailure(errors)
  }

  return userModel.update(userId, values)
}

module.exports = { syncUser, ensureUserFromToken, updateUserProfile }
