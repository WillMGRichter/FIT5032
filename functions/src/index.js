// BR (D.2) Email:
// BR (D.4) Deployment to the Cloud:
// BR (E.1) Cloud Functions:
// BR (F.1) Innovation:
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { defineSecret } = require('firebase-functions/params')
const { logger } = require('firebase-functions/logger')
const admin = require('firebase-admin')
const lib = require('./lib')
const { getQuery } = require('./db')
const { runProjectLifecycle } = require('./jobs/projectLifecycle')
const { runActionReminders } = require('./jobs/actionReminders')
const { getRecommendationsForUser } = require('./recommendations')

admin.initializeApp()

// Deploy all functions in one region.
const REGION = 'australia-southeast1'

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
const SENDGRID_FROM_EMAIL = defineSecret('SENDGRID_FROM_EMAIL')
const EMAIL_HMAC_SECRET = defineSecret('EMAIL_HMAC_SECRET')
const DATABASE_URL = defineSecret('DATABASE_URL')

// Builds a JSON error response.
function jsonError(status, code, message, errors) {
  const detail = { error: message }
  if (code) detail.code = code
  if (errors && typeof errors === 'object') detail.errors = errors
  return detail
}

exports.sendGreenLinkEmail = onRequest(
  {
    region: 'australia-southeast1',
    cors: true,
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, EMAIL_HMAC_SECRET],
  },
  // Handles email requests from signed-in users.
  async (req, res) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    let decoded = null
    try {
      const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        if (token) decoded = await admin.auth().verifyIdToken(token)
      }
    } catch {
      decoded = null
    }

    try {
      const secrets = {
        SENDGRID_API_KEY: SENDGRID_API_KEY.value(),
        SENDGRID_FROM_EMAIL: SENDGRID_FROM_EMAIL.value(),
        EMAIL_HMAC_SECRET: EMAIL_HMAC_SECRET.value(),
      }

      const result = await lib.handleSendEmail({
        body: req.body,
        decoded,
        secrets,
      })

      logger.info('sendGreenLinkEmail ok', {
        requestId,
        kind: result.kind,
        uid: decoded ? decoded.uid : null,
        recipientCount: result.recipientCount,
        attachmentCount: result.attachmentCount,
      })

      res.status(result.status || 200).json(result.body)
    } catch (error) {
      const status = typeof error.status === 'number' ? error.status : 500
      const code = error.code || (status === 500 ? 'INTERNAL' : null)

      if (status === 500) {
        logger.error('sendGreenLinkEmail failed', { requestId, status, code })
      } else {
        logger.info('sendGreenLinkEmail rejected', {
          requestId,
          status,
          code,
          uid: decoded ? decoded.uid : null,
        })
      }

      const message = status === 500 ? 'Something went wrong while sending the email.' : error.message
      res.status(status).json(jsonError(status, code || undefined, message, error.details))
    }
  },
)

exports.projectLifecycle = onSchedule(
  {
    schedule: 'every day 00:10',
    timeZone: 'Australia/Melbourne',
    region: REGION,
    secrets: [DATABASE_URL],
  },
  // Updates project status and notifies participants.
  async () => {
    const summary = await runProjectLifecycle({ query: getQuery() })
    logger.info('projectLifecycle ok', summary)
  },
)

exports.actionReminders = onSchedule(
  {
    schedule: 'every day 08:00',
    timeZone: 'Australia/Melbourne',
    region: REGION,
    secrets: [DATABASE_URL],
  },
  // Sends reminders for actions due tomorrow.
  async () => {
    const summary = await runActionReminders({ query: getQuery() })
    logger.info('actionReminders ok', summary)
  },
)

exports.recommendProjects = onCall(
  {
    region: REGION,
    cors: true,
    secrets: [DATABASE_URL],
  },
  // Returns recommendations for the signed-in user.
  async (request) => {
    // Require a signed-in user for recommendations.
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'You must be signed in to get recommendations.')
    }

    const rawLimit = request.data ? request.data.limit : undefined
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 20) : 5

    try {
      const recommendations = await getRecommendationsForUser({
        query: getQuery(),
        uid: request.auth.uid,
        limit,
      })
      return { recommendations }
    } catch (error) {
      logger.error('recommendProjects failed', { uid: request.auth.uid, message: error.message })
      throw new HttpsError('internal', 'Unable to generate recommendations right now.')
    }
  },
)
