const projectModel = require('../models/projectModel')
const categoryModel = require('../models/categoryModel')

const VALID_STATUSES = ['planned', 'active', 'completed', 'cancelled']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function badRequest(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

async function getProjects(filters) {
  if (filters.status && !VALID_STATUSES.includes(filters.status)) {
    throw badRequest(`status must be one of: ${VALID_STATUSES.join(', ')}`)
  }
  return projectModel.findAll(filters)
}

async function getProjectById(id) {
  if (!Number.isInteger(Number(id))) {
    throw badRequest('Project id must be a number')
  }
  const project = await projectModel.findById(id)
  if (!project) {
    const error = new Error(`Project with id ${id} not found`)
    error.status = 404
    throw error
  }
  return project
}

async function createProject(input) {
  if (!input || typeof input !== 'object') throw badRequest('Request body is required')

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const location = typeof input.location === 'string' ? input.location.trim() : ''

  if (!title) throw badRequest('Title is required')
  if (!description) throw badRequest('Description is required')
  if (!location) throw badRequest('Location is required')

  const category = await categoryModel.findById(input.categoryId)
  if (!category) throw badRequest('A valid categoryId is required')

  const latitude = Number(input.latitude)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw badRequest('Latitude must be a number between -90 and 90')
  }

  const longitude = Number(input.longitude)
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw badRequest('Longitude must be a number between -180 and 180')
  }

  const capacity = Number(input.capacity)
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw badRequest('Capacity must be a whole number greater than zero')
  }

  if (typeof input.startDate !== 'string' || !ISO_DATE.test(input.startDate)) {
    throw badRequest('startDate must be formatted as YYYY-MM-DD')
  }
  if (typeof input.endDate !== 'string' || !ISO_DATE.test(input.endDate)) {
    throw badRequest('endDate must be formatted as YYYY-MM-DD')
  }
  if (new Date(input.endDate) < new Date(input.startDate)) {
    throw badRequest('endDate cannot be before startDate')
  }

  const status = input.status ?? 'planned'
  if (!VALID_STATUSES.includes(status)) {
    throw badRequest(`status must be one of: ${VALID_STATUSES.join(', ')}`)
  }

  if (input.image != null && typeof input.image !== 'string') {
    throw badRequest('image must be a string URL or path')
  }

  return projectModel.create({
    title,
    description,
    categoryId: input.categoryId,
    location,
    latitude,
    longitude,
    image: input.image ? input.image.trim() : null,
    startDate: input.startDate,
    endDate: input.endDate,
    capacity,
    status,
  })
}

module.exports = { getProjects, getProjectById, createProject }
