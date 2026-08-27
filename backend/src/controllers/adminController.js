const adminService = require('../services/adminService')

async function listUsers(req, res, next) {
  try {
    const users = await adminService.listUsers()
    res.json({ data: users })
  } catch (error) {
    next(error)
  }
}

async function updateUserRole(req, res, next) {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role, req.user)
    res.json({ data: user })
  } catch (error) {
    next(error)
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await adminService.deleteUser(req.params.id, req.user)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await adminService.getStats()
    res.json({ data: stats })
  } catch (error) {
    next(error)
  }
}

module.exports = { listUsers, updateUserRole, deleteUser, getStats }
