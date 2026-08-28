const crypto = require('node:crypto')

const FUNCTION_URL = process.env.EMAIL_FUNCTION_URL
const HMAC_SECRET = process.env.EMAIL_HMAC_SECRET
const IS_CONFIGURED = Boolean(FUNCTION_URL)

const REQUEST_TIMEOUT_MS = 15000
const SIGNATURE_TTL_SECONDS = 120

const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

function serviceError(status, message, code = null, details = null) {
  const error = new Error(message)
  error.status = status
  if (code) error.code = code
  if (details) error.details = details
  return error
}

function assertConfigured() {
  if (!IS_CONFIGURED) {
    throw serviceError(503, 'Email service is not configured. Set EMAIL_FUNCTION_URL in the environment.')
  }
  if (!HMAC_SECRET) {
    throw serviceError(503, 'Email signing secret is not configured. Set EMAIL_HMAC_SECRET in the environment.')
  }
}

function canonicalCore(payload) {
  if (payload.kind === 'confirmation') {
    const to = payload.to || {}
    const user = payload.user || {}
    const project = payload.project || {}
    return {
      kind: 'confirmation',
      to: { uid: to.uid ?? null, email: to.email ?? null },
      user: { name: user.name ?? null },
      project: {
        title: project.title ?? null,
        location: project.location ?? null,
        startDate: project.startDate ?? null,
      },
      exp: payload.exp ?? null,
    }
  }
  return {
    kind: payload.kind ?? null,
    projectId: payload.projectId ?? null,
    recipients: (payload.recipients || [])
      .map((recipient) => (recipient && recipient.email ? String(recipient.email).trim().toLowerCase() : ''))
      .filter(Boolean)
      .sort(),
    subject: payload.subject ?? '',
    message: payload.message ?? '',
    exp: payload.exp ?? null,
  }
}

function canonicalBody(payload) {
  return JSON.stringify(canonicalCore(payload))
}

function sign(secret, payload) {
  if (!secret) throw serviceError(503, 'Email signing secret is not configured.')
  return crypto.createHmac('sha256', secret).update(canonicalBody(payload)).digest('base64')
}

function validateAttachment(file) {
  if (file.size > ATTACHMENT_MAX_BYTES) {
    throw serviceError(400, 'Attachment must be 10 MB or smaller.')
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw serviceError(
      400,
      'Attachment type is not allowed. Accepted: PDF, images, Word, Excel, CSV, plain text.',
    )
  }
}

function buildAttachment(file) {
  return {
    content: file.buffer.toString('base64'),
    filename: file.originalname,
    type: file.mimetype,
  }
}

async function callEmailFunction(payload) {
  assertConfigured()

  const exp = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS
  const requestBody = {
    ...payload,
    exp,
    signature: sign(HMAC_SECRET, { ...payload, exp }),
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const message = data?.error || `The email service responded with status ${response.status}.`
      throw serviceError(response.status, message, data?.code, data?.errors)
    }

    return data
  } catch (error) {
    if (error.status) throw error
    if (error.name === 'AbortError') {
      throw serviceError(504, 'The email service took too long to respond.')
    }
    throw serviceError(502, 'Unable to reach the email service.')
  } finally {
    clearTimeout(timeout)
  }
}

async function sendProjectEmail({ projectId, recipients, subject, message, attachments = [] }) {
  return callEmailFunction({
    kind: 'project',
    projectId,
    recipients,
    subject,
    message,
    attachments,
  })
}

async function sendParticipationConfirmation({ userId, email, userName, projectTitle, projectLocation, startDate }) {
  return callEmailFunction({
    kind: 'confirmation',
    to: { uid: String(userId), email },
    user: { name: userName },
    project: {
      title: projectTitle,
      location: projectLocation,
      startDate: startDate ?? null,
    },
  })
}

module.exports = {
  IS_CONFIGURED,
  ATTACHMENT_MAX_BYTES,
  ALLOWED_MIME_TYPES,
  canonicalBody,
  sign,
  validateAttachment,
  buildAttachment,
  sendProjectEmail,
  sendParticipationConfirmation,
  callEmailFunction,
}