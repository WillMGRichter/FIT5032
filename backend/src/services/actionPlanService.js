const actionPlanModel = require('../models/actionPlanModel')
const projectModel = require('../models/projectModel')

const TITLE_MAX = 160
const DESCRIPTION_MAX = 1000
const MAX_SUGGESTIONS = 8
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Creates a validation error.
function badRequest(message, details = null) {
  const error = new Error(message)
  error.status = 400
  if (details) error.details = details
  return error
}

// Creates a missing-record error.
function notFound(message) {
  const error = new Error(message)
  error.status = 404
  return error
}

// Creates an access error.
function forbidden(message) {
  const error = new Error(message)
  error.status = 403
  return error
}

// Checks that an ID contains a whole number.
function assertNumericId(value, message = 'id must be a number') {
  if (!Number.isInteger(Number(value))) {
    throw badRequest(message)
  }
}

// Accepts only real dates in YYYY-MM-DD format.
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

// Cleans and validates action fields.
function validateFields({ title, description, dueDate }) {
  const errors = {}

  const cleanTitle = typeof title === 'string' ? title.trim() : ''
  if (!cleanTitle) {
    errors.title = 'Title is required.'
  } else if (cleanTitle.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`
  }

  let cleanDescription = typeof description === 'string' ? description.trim() : ''
  cleanDescription = cleanDescription === '' ? null : cleanDescription
  if (cleanDescription && cleanDescription.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`
  }

  let cleanDueDate = null
  if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
    cleanDueDate = parseIsoDate(dueDate)
    if (!cleanDueDate) {
      errors.dueDate = 'Due date must be a real date formatted YYYY-MM-DD.'
    }
  }

  return {
    errors,
    values: { title: cleanTitle, description: cleanDescription, dueDate: cleanDueDate },
  }
}

// Loads a project or reports that it is missing.
async function assertProjectExists(projectId) {
  const project = await projectModel.findById(projectId)
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`)
  }
  return project
}

// Checks that the user can plan actions for a project.
async function assertCanPlan(projectId, userId) {
  if (!userId) {
    throw forbidden('You must be signed in to plan actions.')
  }
  const project = await assertProjectExists(projectId)
  if (Number(project.createdBy) === Number(userId)) return
  const participation = await projectModel.findParticipation(projectId, userId)
  if (!participation) {
    throw forbidden('Join this project before planning your actions.')
  }
}

// Loads an action owned by the user.
async function assertOwned(actionId, userId) {
  assertNumericId(actionId, 'Action id must be a number')
  const action = await actionPlanModel.findById(actionId)
  if (!action || Number(action.userId) !== Number(userId)) {
    throw notFound('Action not found')
  }
  return action
}

// Gets actions created by a user.
async function getUserActions(userId) {
  return actionPlanModel.getByUser(userId)
}

// Gets a user's actions for one project.
async function getProjectActions(userId, projectId) {
  assertNumericId(projectId, 'Project id must be a number')
  return actionPlanModel.getProjectActions(userId, projectId)
}

// Validates and saves a new action.
async function createAction({ projectId, userId, title, description, dueDate }) {
  assertNumericId(projectId, 'Project id must be a number')
  await assertCanPlan(projectId, userId)

  const { errors, values } = validateFields({ title, description, dueDate })
  if (Object.keys(errors).length > 0) {
    throw badRequest('Validation failed', errors)
  }

  return actionPlanModel.create({ projectId, userId, ...values })
}

// Validates and saves changes to an action.
async function updateAction(actionId, userId, updates) {
  const action = await assertOwned(actionId, userId)

  const { errors, values } = validateFields({
    title: updates.title ?? action.title,
    description: updates.description !== undefined ? updates.description : action.description,
    dueDate: updates.dueDate !== undefined ? updates.dueDate : action.dueDate,
  })
  if (Object.keys(errors).length > 0) {
    throw badRequest('Validation failed', errors)
  }

  return actionPlanModel.update(actionId, values)
}

// Removes an action owned by the user.
async function deleteAction(actionId, userId) {
  await assertOwned(actionId, userId)
  const removed = await actionPlanModel.deleteById(actionId)
  if (!removed) {
    throw notFound('Action not found')
  }
  return { success: true }
}

// Toggles an action's completion state.
async function toggleAction(actionId, userId) {
  const action = await assertOwned(actionId, userId)
  const completed = !action.completed
  const completedAt = completed ? new Date() : null
  return actionPlanModel.updateCompletion(actionId, completed, completedAt)
}

// Validates a list of suggested actions.
function validateSuggestedTemplates(templates) {
  if (!Array.isArray(templates) || templates.length === 0) {
    throw badRequest('Validation failed', {
      templates: 'Suggested actions must be a non-empty list.',
    })
  }
  if (templates.length > MAX_SUGGESTIONS) {
    throw badRequest('Validation failed', {
      templates: `At most ${MAX_SUGGESTIONS} suggested actions can be generated at once.`,
    })
  }
  return templates.map((template) => {
    const { errors, values } = validateFields(template ?? {})
    if (Object.keys(errors).length > 0) {
      throw badRequest('Validation failed', { templates: errors })
    }
    return values
  })
}

// Creates suggested actions once for a project participant.
async function generateSuggestions({ projectId, userId, templates }) {
  assertNumericId(projectId, 'Project id must be a number')
  const cleanTemplates = validateSuggestedTemplates(templates)

  const participation = await projectModel.findParticipation(projectId, userId)
  if (!participation) {
    throw forbidden('Join this project before generating suggested actions.')
  }

  if (participation.suggestionsGenerated) {
    const existing = await actionPlanModel.getProjectActions(userId, projectId)
    return { actions: existing.filter((action) => action.isSuggested), generated: false }
  }

  const created = []
  for (const template of cleanTemplates) {
    created.push(
      await actionPlanModel.create({ projectId, userId, ...template, isSuggested: true }),
    )
  }
  await projectModel.markSuggestionsGenerated(projectId, userId)
  return { actions: created, generated: true }
}

module.exports = {
  getUserActions,
  getProjectActions,
  createAction,
  updateAction,
  deleteAction,
  toggleAction,
  generateSuggestions,
}
