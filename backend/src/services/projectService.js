const projectModel = require('../models/projectModel')

const VALID_STATUSES = ['planned', 'active', 'completed', 'cancelled']

async function getProjects(filters) {
  if (filters.status && !VALID_STATUSES.includes(filters.status)) {
    const error = new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`)
    error.status = 400
    throw error
  }
  return projectModel.findAll(filters)
}

async function getProjectById(id) {
  if (!Number.isInteger(Number(id))) {
    const error = new Error('Project id must be a number')
    error.status = 400
    throw error
  }
  const project = await projectModel.findById(id)
  if (!project) {
    const error = new Error(`Project with id ${id} not found`)
    error.status = 404
    throw error
  }
  return project
}

module.exports = { getProjects, getProjectById }
