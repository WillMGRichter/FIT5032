const ratingModel = require('../models/ratingModel')
const projectModel = require('../models/projectModel')

const COMMENT_MAX = 500

function badRequest(message, details) {
  const error = new Error(message)
  error.status = 400
  if (details) error.details = details
  return error
}

function notFound(message) {
  const error = new Error(message)
  error.status = 404
  return error
}

function forbidden(message) {
  const error = new Error(message)
  error.status = 403
  return error
}

function validateScore(score) {
  const n = Number(score)
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    return 'Score must be an integer between 1 and 5.'
  }
  return null
}

function validateComment(comment) {
  if (comment == null || String(comment).trim() === '') return null
  if (String(comment).length > COMMENT_MAX) {
    return `Comment must be ${COMMENT_MAX} characters or fewer.`
  }
  return null
}

function validateInput(input) {
  const errors = {}
  const scoreError = validateScore(input.score)
  const commentError = validateComment(input.comment)
  if (scoreError) errors.score = scoreError
  if (commentError) errors.comment = commentError
  if (Object.keys(errors).length > 0) throw badRequest('Validation failed', errors)
}

async function getProjectRatings(projectId) {
  const id = Number(projectId)
  if (!Number.isInteger(id)) throw badRequest('Project id must be a number.')

  const project = await projectModel.findById(id)
  if (!project) throw notFound(`Project with id ${id} not found.`)

  const [ratings, aggregate] = await Promise.all([
    ratingModel.findByProject(id),
    ratingModel.getAggregate(id),
  ])
  return { ratings, aggregate }
}

async function submitRating(projectId, userId, input) {
  const id = Number(projectId)
  if (!Number.isInteger(id)) throw badRequest('Project id must be a number.')

  const project = await projectModel.findById(id)
  if (!project) throw notFound(`Project with id ${id} not found.`)

  validateInput(input)

  const existing = await ratingModel.findByProjectAndUser(id, userId)
  if (existing) {
    throw badRequest('You have already rated this project. Use update instead.', {
      ratingId: existing.id,
    })
  }

  const rating = await ratingModel.create({
    projectId: id,
    userId,
    score: Number(input.score),
    comment: String(input.comment ?? '').trim() || null,
  })

  const aggregate = await ratingModel.getAggregate(id)
  return { rating, aggregate }
}

async function updateRating(ratingId, userId, input) {
  const id = Number(ratingId)
  if (!Number.isInteger(id)) throw badRequest('Rating id must be a number.')

  const target = await ratingModel.findById(id)
  if (!target) throw notFound(`Rating with id ${id} not found.`)
  if (target.userId !== userId) throw forbidden('You can only update your own rating.')

  validateInput(input)

  const updated = await ratingModel.update(id, {
    score: Number(input.score),
    comment: String(input.comment ?? '').trim() || null,
  })

  const aggregate = await ratingModel.getAggregate(target.projectId)
  return { rating: updated, aggregate }
}

async function deleteRating(ratingId, userId) {
  const id = Number(ratingId)
  if (!Number.isInteger(id)) throw badRequest('Rating id must be a number.')

  const target = await ratingModel.findById(id)
  if (!target) throw notFound(`Rating with id ${id} not found.`)
  if (target.userId !== userId) throw forbidden('You can only delete your own rating.')

  await ratingModel.deleteById(id)
  const aggregate = await ratingModel.getAggregate(target.projectId)
  return { success: true, aggregate }
}

module.exports = { getProjectRatings, submitRating, updateRating, deleteRating }
