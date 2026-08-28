const { onRequest } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { logger } = require('firebase-functions/logger')
const admin = require('firebase-admin')
const lib = require('./lib')

admin.initializeApp()

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
const SENDGRID_FROM_EMAIL = defineSecret('SENDGRID_FROM_EMAIL')
const EMAIL_HMAC_SECRET = defineSecret('EMAIL_HMAC_SECRET')

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