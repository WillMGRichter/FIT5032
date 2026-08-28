const adminModel = require('../models/adminModel')
const { setFirebaseRoleClaim } = require('../middleware/auth')

function badRequest(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function notFound(message) {
  const error = new Error(message)
  error.status = 404
  return error
}

async function listUsers() {
  return adminModel.listUsers()
}

async function updateUserRole(id, role, currentUser) {
  const targetId = Number(id)
  if (!Number.isInteger(targetId)) {
    throw badRequest('User id must be a number.')
  }
  const validRoles = ['member', 'admin']
  if (!validRoles.includes(role)) {
    throw badRequest('Role must be "member" or "admin".')
  }

  const allUsers = await adminModel.listUsers()
  const target = allUsers.find((u) => u.id === targetId)
  if (!target) {
    throw notFound(`User with id ${targetId} not found.`)
  }
  if (target.id === currentUser.id) {
    throw badRequest('You cannot change your own role.')
  }
  if (target.role === 'admin' && role === 'member') {
    const adminCount = allUsers.filter((u) => u.role === 'admin').length
    if (adminCount <= 1) {
      throw badRequest('There must be at least one admin. Assign another admin first.')
    }
  }

  const updatedUser = await adminModel.updateUserRole(targetId, role)
  if (target.firebaseUid && updatedUser) {
    setFirebaseRoleClaim(target.firebaseUid, role).catch(() => {})
  }
  return updatedUser
}

async function deleteUser(id, currentUser) {
  const targetId = Number(id)
  if (!Number.isInteger(targetId)) {
    throw badRequest('User id must be a number.')
  }

  const allUsers = await adminModel.listUsers()
  const target = allUsers.find((u) => u.id === targetId)
  if (!target) {
    throw notFound(`User with id ${targetId} not found.`)
  }
  if (target.id === currentUser.id) {
    throw badRequest('You cannot delete your own account from the admin panel.')
  }

  const deleted = await adminModel.deleteUser(targetId)
  return { success: deleted }
}

async function getStats() {
  return adminModel.getStats()
}

module.exports = { listUsers, updateUserRole, deleteUser, getStats }
