const crypto = require('node:crypto')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_RECIPIENTS = 50
const MAX_ATTACHMENTS = 5
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
const SIGNATURE_TTL_SECONDS = 300

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

const KINDS = ['broadcast', 'project', 'confirmation']

function httpError(status, code, message, details = null) {
  const error = new Error(message)
  error.status = status
  error.code = code
  error.details = details
  return error
}

function validateEmail(value) {
  return typeof value === 'string' && value.length <= 255 && EMAIL_PATTERN.test(value)
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
      .map((r) => (r && r.email ? String(r.email).trim().toLowerCase() : ''))
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
  if (!secret) throw httpError(503, 'SIGNING_UNCONFIGURED', 'Email signing is not configured.')
  return crypto.createHmac('sha256', secret).update(canonicalBody(payload)).digest('base64')
}

function verifySignature(secret, body) {
  if (!secret) return false
  if (typeof body.signature !== 'string' || body.signature.length === 0) return false

  const exp = Number(body.exp)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(exp) || exp < now - 60 || exp > now + SIGNATURE_TTL_SECONDS + 60) {
    return false
  }

  const expected = sign(secret, body)
  const received = Buffer.from(body.signature)
  const wanted = Buffer.from(expected)
  if (received.length !== wanted.length) return false
  return crypto.timingSafeEqual(received, wanted)
}

function validateMessage(subject, message) {
  const errors = {}
  subject = typeof subject === 'string' ? subject.trim() : ''
  message = typeof message === 'string' ? message.trim() : ''

  if (!subject) errors.subject = 'Subject is required.'
  else if (subject.length > 200) errors.subject = 'Subject must be 200 characters or fewer.'

  if (!message) errors.message = 'Message is required.'
  else if (message.length > 5000) errors.message = 'Message must be 5000 characters or fewer.'

  return { subject, message, errors }
}

function validateRecipients(rawRecipients) {
  const errors = {}
  const recipients = []

  if (!Array.isArray(rawRecipients) || rawRecipients.length === 0) {
    errors.recipients = 'At least one recipient is required.'
    return { recipients, errors }
  }

  const seen = new Set()
  for (const entry of rawRecipients) {
    const email = entry && typeof entry.email === 'string'
      ? entry.email.trim().toLowerCase()
      : ''
    if (!validateEmail(email)) continue
    if (!seen.has(email)) {
      seen.add(email)
      recipients.push({ email })
    }
  }

  if (recipients.length === 0) {
    errors.recipients = 'At least one valid recipient email is required.'
  } else if (recipients.length > MAX_RECIPIENTS) {
    errors.recipients = `A maximum of ${MAX_RECIPIENTS} recipients is allowed.`
  }

  return { recipients, errors }
}

function validateAttachments(rawAttachments) {
  const errors = {}
  const attachments = []

  if (rawAttachments == null || rawAttachments === '') {
    return { attachments, errors }
  }
  if (!Array.isArray(rawAttachments)) {
    errors.attachments = 'Attachments must be a list.'
    return { attachments, errors }
  }
  if (rawAttachments.length === 0) {
    return { attachments, errors }
  }
  if (rawAttachments.length > MAX_ATTACHMENTS) {
    errors.attachments = `A maximum of ${MAX_ATTACHMENTS} attachments is allowed.`
    return { attachments, errors }
  }

  for (const att of rawAttachments) {
    if (!att || typeof att !== 'object') {
      errors.attachments = 'Each attachment must be an object.'
      break
    }

    const content = typeof att.content === 'string' ? att.content.trim() : ''
    if (
      !content ||
      content.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(content)
    ) {
      errors.attachments = 'One or more attachments have invalid encoded content.'
      break
    }

    let buffer
    try {
      buffer = Buffer.from(content, 'base64')
    } catch {
      errors.attachments = 'One or more attachments could not be decoded.'
      break
    }
    if (buffer.length === 0) {
      errors.attachments = 'One or more attachments are empty.'
      break
    }
    if (buffer.length > ATTACHMENT_MAX_BYTES) {
      errors.attachments = 'Each attachment must be 10 MB or smaller.'
      break
    }

    const filename = typeof att.filename === 'string' ? att.filename.trim() : ''
    if (!filename || filename.length > 255) {
      errors.attachments = 'Each attachment needs a valid file name.'
      break
    }

    const type = typeof att.type === 'string' ? att.type : ''
    if (!ALLOWED_MIME_TYPES.includes(type)) {
      errors.attachments = 'One or more attachments use a disallowed file type.'
      break
    }

    attachments.push({ content, filename, type })
  }

  return { attachments, errors }
}

function validateConfirmation(body) {
  const errors = {}
  const to = ({} && body.to) || {}
  const user = ({} && body.user) || {}
  const project = ({} && body.project) || {}

  if (!body.to || typeof body.to !== 'object') {
    errors.to = 'Recipient is required.'
  } else {
    if (typeof to.uid !== 'string' || !to.uid) errors.to = 'Recipient uid is required.'
    if (typeof to.email !== 'string' || !validateEmail(to.email.trim())) {
      errors.to = errors.to || 'Recipient email is invalid.'
    }
  }

  if (!user || typeof user.name !== 'string' || !user.name.trim()) {
    errors.user = 'User name is required.'
  }
  if (!project || typeof project.title !== 'string' || !project.title.trim()) {
    errors.project = 'Project title is required.'
  }
  if (!project || typeof project.location !== 'string' || !project.location.trim()) {
    errors.project = errors.project || 'Project location is required.'
  }

  return {
    errors,
    to: to.uid ? { uid: String(to.uid), email: String(to.email).trim() } : null,
    user: { name: user.name ? String(user.name).trim() : '' },
    project: {
      title: project.title ? String(project.title).trim() : '',
      location: project.location ? String(project.location).trim() : '',
      startDate: project.startDate ? String(project.startDate).trim() : null,
    },
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

function buildConfirmationMessage({ user, project }) {
  const subject = `You're confirmed for "${project.title}"`
  const text = [
    `Hi ${user.name},`,
    '',
    `You've been confirmed as a volunteer for "${project.title}" at ${project.location}.`,
    project.startDate ? `The project starts on ${project.startDate}.` : '',
    '',
    'Thank you for contributing to urban greening in Melbourne!',
    '',
    '— GreenLink Team',
  ]
    .filter(Boolean)
    .join('\n')

  const html = [
    `<p>Hi ${escapeHtml(user.name)},</p>`,
    `<p>You've been confirmed as a volunteer for <strong>"${escapeHtml(project.title)}"</strong> at ${escapeHtml(project.location)}.`,
    project.startDate ? `The project starts on <strong>${escapeHtml(project.startDate)}</strong>.` : '',
    '</p>',
    '<p>Thank you for contributing to urban greening in Melbourne!</p>',
    '<p>&mdash; GreenLink Team</p>',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, text, html }
}

function defaultMailer(apiKey) {
  // eslint-disable-next-line global-require
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(apiKey)
  return {
    send(messages) {
      return sgMail.send(messages)
    },
  }
}

function authorize({ kind, decoded, body, secret }) {
  if (kind === 'broadcast') {
    if (decoded.role !== 'admin') {
      throw httpError(403, 'FORBIDDEN', 'Admin access is required to email all users.')
    }
  } else if (kind === 'project') {
    const isAdmin = decoded.role === 'admin'
    const signed = verifySignature(secret, body)
    if (!isAdmin && !signed) {
      throw httpError(403, 'FORBIDDEN', 'You do not have permission to email these recipients.')
    }
  } else if (kind === 'confirmation') {
    const self = Boolean(body.to && decoded.uid === String(body.to.uid))
    const signed = verifySignature(secret, body)
    if (!self && !signed) {
      throw httpError(403, 'FORBIDDEN', 'Confirmations can only be sent to your own account.')
    }
  } else {
    throw httpError(400, 'INVALID_KIND', `kind must be one of: ${KINDS.join(', ')}.`)
  }
}

async function handleSendEmail({ body, decoded, secrets, provider = null }) {
  if (!decoded || !decoded.uid) {
    throw httpError(401, 'UNAUTHENTICATED', 'You must be signed in to send email.')
  }
  if (!secrets || typeof secrets.SENDGRID_API_KEY !== 'string' || !secrets.SENDGRID_API_KEY.trim()) {
    throw httpError(503, 'EMAIL_UNCONFIGURED', 'The email service is not configured.')
  }

  const kind = body && typeof body.kind === 'string' ? body.kind : 'broadcast'
  const mailer = provider || defaultMailer(secrets.SENDGRID_API_KEY)
  const from = (secrets.SENDGRID_FROM_EMAIL || 'noreply@greenlink.org').trim()

  authorize({ kind, decoded, body, secret: secrets.EMAIL_HMAC_SECRET })

  if (kind === 'confirmation') {
    const { errors, to, user, project } = validateConfirmation(body)
    if (Object.keys(errors).length > 0) {
      throw httpError(400, 'VALIDATION_FAILED', 'Validation failed', errors)
    }

    const message = buildConfirmationMessage({ user, project })
    await mailer.send({
      to: to.email,
      from,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })

    return {
      status: 200,
      body: { ok: true, kind, to: 1 },
      kind,
      recipientCount: 1,
      attachmentCount: 0,
      uid: decoded.uid,
    }
  }

  const { subject, message, errors: messageErrors } = validateMessage(
    body.subject,
    body.message,
  )
  const { recipients, errors: recipientErrors } = validateRecipients(body.recipients)
  const { attachments, errors: attachmentErrors } = validateAttachments(body.attachments)

  const errors = { ...messageErrors, ...recipientErrors, ...attachmentErrors }
  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'VALIDATION_FAILED', 'Validation failed', errors)
  }

  const shared = {
    from,
    subject,
    text: message,
    html: toHtml(message),
    ...(attachments.length > 0 ? { attachments: attachments.map((a) => ({ ...a, disposition: 'attachment' })) } : {}),
  }

  await mailer.send(recipients.map((r) => ({ ...shared, to: r.email })))

  return {
    status: 200,
    body: { ok: true, kind, to: recipients.length },
    kind,
    recipientCount: recipients.length,
    attachmentCount: attachments.length,
    uid: decoded.uid,
  }
}

module.exports = {
  handleSendEmail,
  sign,
  verifySignature,
  canonicalBody,
  canonicalCore,
  validateEmail,
  validateMessage,
  validateRecipients,
  validateAttachments,
  buildConfirmationMessage,
  httpError,
  KINDS,
  ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_BYTES,
  MAX_RECIPIENTS,
  MAX_ATTACHMENTS,
}