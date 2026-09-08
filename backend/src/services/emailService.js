const crypto = require('node:crypto')

const sgMail = require('@sendgrid/mail')

const API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@greenlink.org'
const IS_CONFIGURED = Boolean(API_KEY && FROM_EMAIL)

if (API_KEY) {
  sgMail.setApiKey(API_KEY)
}

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function serviceError(status, message, code = null, details = null) {
  const error = new Error(message)
  error.status = status
  if (code) error.code = code
  if (details) error.details = details
  return error
}

function assertConfigured() {
  if (!API_KEY) {
    throw serviceError(503, 'Email service is not configured. Set SENDGRID_API_KEY in the environment.')
  }
  if (!FROM_EMAIL) {
    throw serviceError(503, 'Email service is not configured. Set SENDGRID_FROM_EMAIL in the environment.')
  }
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

function validEmail(email) {
  return typeof email === 'string' && email.length <= 255 && EMAIL_PATTERN.test(email)
}

function normalizeRecipients(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw serviceError(400, 'At least one recipient is required.')
  }
  const emails = recipients
    .map((r) => (r && typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''))
    .filter(validEmail)
  if (emails.length === 0) {
    throw serviceError(400, 'At least one valid recipient email is required.')
  }
  return [...new Set(emails)]
}

function sanitizeInput({ subject, message }) {
  const trimmedSubject = typeof subject === 'string' ? subject.trim() : ''
  const trimmedMessage = typeof message === 'string' ? message.trim() : ''
  if (!trimmedSubject) throw serviceError(400, 'Subject is required.')
  if (trimmedSubject.length > 200) throw serviceError(400, 'Subject must be 200 characters or fewer.')
  if (!trimmedMessage) throw serviceError(400, 'Message is required.')
  if (trimmedMessage.length > 5000) throw serviceError(400, 'Message must be 5000 characters or fewer.')
  return { subject: trimmedSubject, message: trimmedMessage }
}

function sendgridAttachments(attachments) {
  return (attachments || []).map((a) => ({
    content: a.content,
    filename: a.filename,
    type: a.type,
    disposition: 'attachment',
  }))
}

async function sendMail({ kind, recipients, subject, message, attachments = [], user }) {
  assertConfigured()

  const emails = normalizeRecipients(recipients)
  const { subject: cleanSubject, message: cleanMessage } = sanitizeInput({ subject, message })

  const shared = {
    from: FROM_EMAIL,
    subject: cleanSubject,
    text: cleanMessage,
    html: toHtml(cleanMessage),
    ...(attachments.length > 0 ? { attachments: sendgridAttachments(attachments) } : {}),
  }

  await sgMail.send(emails.map((email) => ({ ...shared, to: email })))

  return {
    kind,
    recipientCount: emails.length,
    attachmentCount: attachments.length,
    uid: user ? user.id : null,
  }
}

async function sendProjectEmail({ projectId, recipients, subject, message, attachments = [], user }) {
  return sendMail({ kind: 'project', recipients, subject, message, attachments, user })
}

async function sendBroadcastEmail({ recipients, subject, message, attachments = [], user }) {
  return sendMail({ kind: 'broadcast', recipients, subject, message, attachments, user })
}

async function sendParticipationConfirmation({ userId, email, userName, projectTitle, projectLocation, startDate }) {
  assertConfigured()

  const message = buildConfirmationMessage({
    user: { name: userName },
    project: { title: projectTitle, location: projectLocation, startDate },
  })

  if (!validEmail(email)) {
    throw serviceError(400, 'Recipient email is invalid.')
  }

  await sgMail.send({
    to: email,
    from: FROM_EMAIL,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })

  return { kind: 'confirmation', recipientCount: 1, attachmentCount: 0, uid: userId }
}

// Kept for backward compatibility in tests and tooling that still sign payloads.
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
  if (!secret) throw serviceError(503, 'Email signing secret is not configured.')
  return crypto.createHmac('sha256', secret).update(canonicalBody(payload)).digest('base64')
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
  sendBroadcastEmail,
  sendParticipationConfirmation,
}