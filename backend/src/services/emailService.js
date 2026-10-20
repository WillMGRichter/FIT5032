const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const sgMail = require('@sendgrid/mail')

const JOIN_ATTACHMENT_PATH = path.join(__dirname, '..', '..', 'assets', 'join_attachment.png')
let joinAttachmentCache

// Returns the participation join attachment sent every time a user joins a project
function getJoinAttachment() {
  if (joinAttachmentCache !== undefined) return joinAttachmentCache
  try {
    joinAttachmentCache = {
      content: fs.readFileSync(JOIN_ATTACHMENT_PATH).toString('base64'),
      filename: 'greenlink-join.png',
      type: 'image/png',
      disposition: 'attachment',
    }
  } catch {
    joinAttachmentCache = null
  }
  return joinAttachmentCache
}

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

// Creates an email service error.
function serviceError(status, message, code = null, details = null) {
  const error = new Error(message)
  error.status = status
  if (code) error.code = code
  if (details) error.details = details
  return error
}

//Confirms apis/secrets are configured
function assertConfigured() {
  if (!API_KEY) {
    throw serviceError(503, 'Email service is not configured. Set SENDGRID_API_KEY in the environment.')
  }
  if (!FROM_EMAIL) {
    throw serviceError(503, 'Email service is not configured. Set SENDGRID_FROM_EMAIL in the environment.')
  }
}

//Validates attachment size and type
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

//Builds a SendGrid attachment from a file
function buildAttachment(file) {
  return {
    content: file.buffer.toString('base64'),
    filename: file.originalname,
    type: file.mimetype,
  }
}

//Ensures user text is safe for HTML output
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

//Converts plain text to HTML
function toHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

//Creates confirmation email message for when a user joins a project
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

  return { subject, text, html } //Both plain and html as not all clients support html. SendGrid will send both and the client will choose which to display.
}

//Confirms valid email
function validEmail(email) {
  return typeof email === 'string' && email.length <= 255 && EMAIL_PATTERN.test(email)
}

//Confirms there are email recipients and filters out all invalid emails.
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

// Validates email subject and message
function sanitizeInput({ subject, message }) {
  const trimmedSubject = typeof subject === 'string' ? subject.trim() : ''
  const trimmedMessage = typeof message === 'string' ? message.trim() : ''
  if (!trimmedSubject) throw serviceError(400, 'Subject is required.')
  if (trimmedSubject.length > 200) throw serviceError(400, 'Subject must be 200 characters or fewer.')
  if (!trimmedMessage) throw serviceError(400, 'Message is required.')
  if (trimmedMessage.length > 5000) throw serviceError(400, 'Message must be 5000 characters or fewer.')
  return { subject: trimmedSubject, message: trimmedMessage }
}

// Converts a file to a SendGrid attachment object
function sendgridAttachments(attachments) {
  return (attachments || []).map((a) => ({
    content: a.content,
    filename: a.filename,
    type: a.type,
    disposition: 'attachment',
  }))
}

//Function to send email
async function sendMail({ kind, recipients, subject, message, attachments = [], user }) {
  assertConfigured() //Validates secrets

  const emails = normalizeRecipients(recipients) // Validates recipients and filters out invalid emails
  const { subject: cleanSubject, message: cleanMessage } = sanitizeInput({ subject, message }) //Cleans subject and messgae

  // Builds email payload with shared properties for all recipients
  const shared = {
    from: FROM_EMAIL,
    subject: cleanSubject,
    text: cleanMessage,
    html: toHtml(cleanMessage),
    ...(attachments.length > 0 ? { attachments: sendgridAttachments(attachments) } : {}),
  }

  // Sends the email to all recipients using SendGrid
  await sgMail.send(emails.map((email) => ({ ...shared, to: email })))

  return {
    kind,
    recipientCount: emails.length,
    attachmentCount: attachments.length,
    uid: user ? user.id : null,
  }
}

// Sends email to project participants.
async function sendProjectEmail({ projectId, recipients, subject, message, attachments = [], user }) {
  return sendMail({ kind: 'project', recipients, subject, message, attachments, user })
}

// Sends email to broadcast recipients.
async function sendBroadcastEmail({ recipients, subject, message, attachments = [], user }) {
  return sendMail({ kind: 'broadcast', recipients, subject, message, attachments, user })
}

// Function to send participation confirmation email
async function sendParticipationConfirmation({ userId, email, userName, projectTitle, projectLocation, startDate }) {
  assertConfigured()

  const message = buildConfirmationMessage({
    user: { name: userName },
    project: { title: projectTitle, location: projectLocation, startDate },
  })

  if (!validEmail(email)) {
    throw serviceError(400, 'Recipient email is invalid.')
  }

  // Gets the participation join attachment
  const attachment = getJoinAttachment() //

  await sgMail.send({
    to: email,
    from: FROM_EMAIL,
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(attachment ? { attachments: [attachment] } : {}),
  })

  return {
    kind: 'confirmation',
    recipientCount: 1,
    attachmentCount: attachment ? 1 : 0,
    uid: userId,
  }
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

// Converts the signed fields to JSON.
function canonicalBody(payload) {
  return JSON.stringify(canonicalCore(payload))
}

// Signs the canonical email request.
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
