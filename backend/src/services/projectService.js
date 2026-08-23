const projectModel = require('../models/projectModel')
const categoryModel = require('../models/categoryModel')

const VALID_STATUSES = ['planned', 'active', 'completed', 'cancelled']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const TITLE_MAX = 160
const LOCATION_MAX = 160
const DESCRIPTION_MIN = 20
const DESCRIPTION_MAX = 2000
const IMAGE_MAX = 255

function badRequest(message, details = null) {
  const error = new Error(message)
  error.status = 400
  if (details) error.details = details
  return error
}

function parseIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const matchesCalendar =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  return matchesCalendar ? value : null
}

function validateProjectInput(input) {
  const errors = {}

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) {
    errors.title = 'Title is required.'
  } else if (title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`
  }

  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (!description) {
    errors.description = 'Description is required.'
  } else if (description.length < DESCRIPTION_MIN) {
    errors.description = `Description must be at least ${DESCRIPTION_MIN} characters.`
  } else if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`
  }

  if (!input.categoryId) {
    errors.categoryId = 'A category is required.'
  }

  const location = typeof input.location === 'string' ? input.location.trim() : ''
  if (!location) {
    errors.location = 'Location is required.'
  } else if (location.length > LOCATION_MAX) {
    errors.location = `Location must be ${LOCATION_MAX} characters or fewer.`
  }

  const latitude = Number(input.latitude)
  if (input.latitude === undefined || input.latitude === null || input.latitude === '') {
    errors.latitude = 'Latitude is required.'
  } else if (!Number.isFinite(latitude)) {
    errors.latitude = 'Latitude must be a number.'
  } else if (latitude < -90 || latitude > 90) {
    errors.latitude = 'Latitude must be between -90 and 90.'
  }

  const longitude = Number(input.longitude)
  if (input.longitude === undefined || input.longitude === null || input.longitude === '') {
    errors.longitude = 'Longitude is required.'
  } else if (!Number.isFinite(longitude)) {
    errors.longitude = 'Longitude must be a number.'
  } else if (longitude < -180 || longitude > 180) {
    errors.longitude = 'Longitude must be between -180 and 180.'
  }

  if (input.image != null && input.image !== '') {
    const image = String(input.image).trim()
    if (image.length > IMAGE_MAX) {
      errors.image = `Image URL must be ${IMAGE_MAX} characters or fewer.`
    } else if (!/^https?:\/\//.test(image) && !image.startsWith('/')) {
      errors.image = 'Image must be an http(s) URL or a path starting with "/".'
    }
  }

  if (!parseIsoDate(input.startDate)) {
    errors.startDate = 'Start date is required and must be a real date formatted YYYY-MM-DD.'
  }

  const endDate = parseIsoDate(input.endDate)
  if (!endDate) {
    errors.endDate = 'End date is required and must be a real date formatted YYYY-MM-DD.'
  } else if (!errors.startDate && endDate < parseIsoDate(input.startDate)) {
    errors.endDate = 'End date cannot be before the start date.'
  }

  const capacity = Number(input.capacity)
  if (input.capacity === undefined || input.capacity === null || input.capacity === '') {
    errors.capacity = 'Capacity is required.'
  } else if (!Number.isInteger(capacity)) {
    errors.capacity = 'Capacity must be a whole number.'
  } else if (capacity <= 0) {
    errors.capacity = 'Capacity must be greater than zero.'
  }

  const status = input.status ?? 'planned'
  if (!VALID_STATUSES.includes(status)) {
    errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}.`
  }

  return {
    errors,
    values: {
      title,
      description,
      location,
      image: input.image ? String(input.image).trim() : null,
      startDate: input.startDate,
      endDate: input.endDate,
      categoryId: input.categoryId,
      latitude,
      longitude,
      capacity,
      status,
    },
  }
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

async function validateProjectData(input) {
  const { errors, values } = validateProjectInput(input)

  if (values.categoryId && !errors.categoryId) {
    const category = await categoryModel.findById(values.categoryId)
    if (!category) {
      errors.categoryId = 'Selected category does not exist.'
    }
  }

  if (Object.keys(errors).length > 0) {
    throw badRequest('Validation failed', errors)
  }

  return values
}

function assertJsonObject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Request body must be a JSON object')
  }
}

async function createProject(input) {
  assertJsonObject(input)
  const values = await validateProjectData(input)

  return projectModel.create({
    title: values.title,
    description: values.description,
    categoryId: values.categoryId,
    location: values.location,
    latitude: values.latitude,
    longitude: values.longitude,
    image: values.image,
    startDate: values.startDate,
    endDate: values.endDate,
    capacity: values.capacity,
    status: values.status,
  })
}

async function updateProject(id, input) {
  const projectId = Number(id)
  if (!Number.isInteger(projectId)) {
    throw badRequest('Project id must be a number')
  }

  const existing = await projectModel.findById(projectId)
  if (!existing) {
    const error = new Error(`Project with id ${projectId} not found`)
    error.status = 404
    throw error
  }

  assertJsonObject(input)
  const values = await validateProjectData(input)

  return projectModel.update(projectId, {
    title: values.title,
    description: values.description,
    categoryId: values.categoryId,
    location: values.location,
    latitude: values.latitude,
    longitude: values.longitude,
    image: values.image,
    startDate: values.startDate,
    endDate: values.endDate,
    capacity: values.capacity,
    status: values.status,
  })
}

module.exports = { getProjects, getProjectById, createProject, updateProject }
