const sgMail = require('@sendgrid/mail')

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@greenlink.org'
const IS_CONFIGURED = Boolean(process.env.SENDGRID_API_KEY)

if (IS_CONFIGURED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

function assertConfigured() {
  if (!IS_CONFIGURED) {
    const error = new Error('Email service is not configured. Set SENDGRID_API_KEY in the environment.')
    error.status = 503
    throw error
  }
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

function validateAttachment(file) {
  if (file.size > ATTACHMENT_MAX_BYTES) {
    throw Object.assign(new Error('Attachment must be 10 MB or smaller.'), { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw Object.assign(
      new Error('Attachment type is not allowed. Accepted: PDF, images, Word, Excel, CSV, plain text.'),
      { status: 400 },
    )
  }
}

function buildAttachment(file) {
  return {
    content: file.buffer.toString('base64'),
    filename: file.originalname,
    type: file.mimetype,
    disposition: 'attachment',
  }
}

function buildConfirmationEmail({ userName, projectTitle, projectLocation, startDate }) {
  return {
    subject: `You're confirmed for "${projectTitle}"`,
    text: [
      `Hi ${userName},`,
      '',
      `You've been confirmed as a volunteer for "${projectTitle}" at ${projectLocation}.`,
      startDate ? `The project starts on ${startDate}.` : '',
      '',
      'Thank you for contributing to urban greening in Melbourne!',
      '',
      '— GreenLink Team',
    ]
      .filter(Boolean)
      .join('\n'),
    html: [
      `<p>Hi ${userName},</p>`,
      `<p>You've been confirmed as a volunteer for <strong>"${projectTitle}"</strong> at ${projectLocation}.`,
      startDate ? `The project starts on <strong>${startDate}</strong>.` : '',
      '</p>',
      '<p>Thank you for contributing to urban greening in Melbourne!</p>',
      '<p>— GreenLink Team</p>',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  assertConfigured()

  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    text,
    html: html || text,
  }

  if (attachments.length > 0) {
    msg.attachments = attachments
  }

  await sgMail.send(msg)
}

async function sendBulkEmail({ recipients, subject, text, html, attachments = [] }) {
  assertConfigured()

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw Object.assign(new Error('At least one recipient is required.'), { status: 400 })
  }

  const messages = recipients.map((recipient) => ({
    to: recipient.email,
    from: FROM_EMAIL,
    subject,
    text,
    html: html || text,
    attachments: attachments.length > 0 ? attachments : undefined,
  }))

  await sgMail.send(messages)
}

async function sendParticipationConfirmation({ email, userName, projectTitle, projectLocation, startDate }) {
  const confirmation = buildConfirmationEmail({ userName, projectTitle, projectLocation, startDate })
  await sendEmail({
    to: email,
    subject: confirmation.subject,
    text: confirmation.text,
    html: confirmation.html,
  })
}

module.exports = {
  IS_CONFIGURED,
  ATTACHMENT_MAX_BYTES,
  ALLOWED_MIME_TYPES,
  validateAttachment,
  buildAttachment,
  buildConfirmationEmail,
  sendEmail,
  sendBulkEmail,
  sendParticipationConfirmation,
}
