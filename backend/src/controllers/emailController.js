const pool = require('../config/db')
const emailService = require('../services/emailService')
const { buildAttachment } = emailService

function badRequest(message, details = null) {
  const error = new Error(message)
  error.status = 400
  if (details) error.details = details
  return error
}

function validateSendInput(body) {
  const errors = {}

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  if (!subject) {
    errors.subject = 'Subject is required.'
  } else if (subject.length > 200) {
    errors.subject = 'Subject must be 200 characters or fewer.'
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    errors.message = 'Message is required.'
  } else if (message.length > 5000) {
    errors.message = 'Message must be 5000 characters or fewer.'
  }

  if (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0) {
    errors.recipients = 'At least one recipient is required.'
  } else {
    const invalid = body.recipients.filter((r) => !r || typeof r.email !== 'string' || !r.email.includes('@'))
    if (invalid.length > 0) {
      errors.recipients = 'One or more recipient emails are invalid.'
    }
  }

  return { subject, message, errors }
}

async function getProjectParticipants(projectId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name
       FROM project_participations pp
       JOIN users u ON u.id = pp.user_id
      WHERE pp.project_id = $1
      ORDER BY pp.joined_at`,
    [projectId],
  )
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
  }))
}

async function sendManualEmail(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw Object.assign(new Error('Admin access required.'), { status: 403 })
    }

    const { subject, message, errors } = validateSendInput(req.body)
    if (Object.keys(errors).length > 0) {
      throw badRequest('Validation failed', errors)
    }

    const attachments = (req.files || []).map(buildAttachment)
    for (const file of (req.files || [])) {
      emailService.validateAttachment(file)
    }

    await emailService.sendBulkEmail({
      recipients: req.body.recipients,
      subject,
      text: message,
      attachments,
    })

    res.json({ data: { success: true, recipientCount: req.body.recipients.length } })
  } catch (error) {
    next(error)
  }
}

async function sendProjectEmail(req, res, next) {
  try {
    if (!req.user) {
      throw Object.assign(new Error('Authentication required.'), { status: 401 })
    }

    const projectId = Number(req.params.id)
    if (!Number.isInteger(projectId)) {
      throw badRequest('Project id must be a number')
    }

    const { rows: projectRows } = await pool.query(
      'SELECT id, title, location, created_by FROM projects WHERE id = $1',
      [projectId],
    )
    if (projectRows.length === 0) {
      throw Object.assign(new Error('Project not found.'), { status: 404 })
    }

    const project = projectRows[0]
    if (req.user.role !== 'admin' && project.created_by !== req.user.id) {
      throw Object.assign(new Error('Only the project creator or an admin can email participants.'), { status: 403 })
    }

    const { subject, message, errors } = validateSendInput(req.body)
    if (Object.keys(errors).length > 0) {
      throw badRequest('Validation failed', errors)
    }

    const attachments = (req.files || []).map(buildAttachment)
    for (const file of (req.files || [])) {
      emailService.validateAttachment(file)
    }

    const participants = await getProjectParticipants(projectId)
    const recipients = req.body.recipients && req.body.recipients.length > 0
      ? participants.filter((p) =>
          req.body.recipients.some((r) => r.email === p.email),
        )
      : participants

    if (recipients.length === 0) {
      throw badRequest('No valid recipients found for this project.')
    }

    await emailService.sendBulkEmail({
      recipients,
      subject,
      text: message,
      attachments,
    })

    res.json({ data: { success: true, recipientCount: recipients.length } })
  } catch (error) {
    next(error)
  }
}

async function getProjectParticipantsEndpoint(req, res, next) {
  try {
    if (!req.user) {
      throw Object.assign(new Error('Authentication required.'), { status: 401 })
    }

    const projectId = Number(req.params.id)
    if (!Number.isInteger(projectId)) {
      throw badRequest('Project id must be a number')
    }

    const { rows: projectRows } = await pool.query(
      'SELECT id, created_by FROM projects WHERE id = $1',
      [projectId],
    )
    if (projectRows.length === 0) {
      throw Object.assign(new Error('Project not found.'), { status: 404 })
    }

    const project = projectRows[0]
    if (req.user.role !== 'admin' && project.created_by !== req.user.id) {
      throw Object.assign(new Error('Only the project creator or an admin can view participants.'), { status: 403 })
    }

    const participants = await getProjectParticipants(projectId)
    res.json({ data: participants })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  sendManualEmail,
  sendProjectEmail,
  getProjectParticipantsEndpoint,
}
