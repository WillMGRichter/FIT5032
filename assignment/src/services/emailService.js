import { apiRequest, ApiError } from './api.js'
import { auth } from './firebase.js'

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000'
const FUNCTION_URL = import.meta.env?.VITE_EMAIL_FUNCTION_URL || ''

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const comma = result.indexOf(',')
        resolve(comma === -1 ? result : result.slice(comma + 1))
      } else {
        reject(new Error('Could not read attachment.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read attachment.'))
    reader.readAsDataURL(file)
  })
}

export async function sendEmail({ recipients, subject, message, attachments = [] }) {
  if (!FUNCTION_URL) {
    throw new ApiError('The email service is not configured. Set VITE_EMAIL_FUNCTION_URL.', {
      status: 503,
      details: null,
    })
  }
  if (!auth.currentUser) {
    throw new ApiError('You must be signed in to send email.', { status: 401, details: null })
  }

  const token = await auth.currentUser.getIdToken(true)

  const attachmentPayload = []
  for (const file of attachments) {
    attachmentPayload.push({
      filename: file.name,
      type: file.type,
      content: await fileToBase64(file),
    })
  }

  let response
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        kind: 'broadcast',
        recipients: recipients.map((r) => ({ email: r.email })),
        subject,
        message,
        attachments: attachmentPayload,
      }),
    })
  } catch (details) {
    throw new ApiError('Unable to reach the email service', { status: 0, details })
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(payload?.error || 'Failed to send email', {
      status: response.status,
      details: payload ?? null,
    })
  }

  return payload
}

export async function sendProjectEmail(projectId, { recipients, subject, message, attachments = [] }) {
  const formData = new FormData()
  if (recipients && recipients.length > 0) {
    formData.append('recipients', JSON.stringify(recipients))
  }
  formData.append('subject', subject)
  formData.append('message', message)
  for (const file of attachments) {
    formData.append('attachments', file)
  }

  const url = new URL(`${BASE_URL.replace(/\/+$/, '')}/api/email/projects/${projectId}/send`)
  const headers = {}

  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken()
    headers['Authorization'] = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    })
  } catch (details) {
    throw new ApiError('Unable to reach the GreenLink API', { status: 0, details })
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(payload?.error || 'Failed to send email', {
      status: response.status,
      details: payload ?? null,
    })
  }

  return payload?.data
}

export async function getProjectParticipants(projectId) {
  return apiRequest(`/api/email/projects/${projectId}/participants`)
}