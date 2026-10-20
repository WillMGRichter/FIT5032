// BR (D.2) Email:
import { apiRequest, ApiError } from './api.js'
import { auth } from './firebase.js'

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000'
const EMAIL_FUNCTION_URL = import.meta.env?.VITE_EMAIL_FUNCTION_URL || ''

const EXTENSION_TO_MIME = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

// Encodes a file as a JSON attachment.
async function fileToAttachment(file) {
  // Convert the file in small chunks.
  const buffer = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize))
  }

  const ext = '.' + file.name.split('.').pop().toLowerCase()
  return {
    content: btoa(binary),
    filename: file.name,
    type: file.type || EXTENSION_TO_MIME[ext] || 'application/octet-stream',
  }
}

// Sends a broadcast email through the cloud endpoint.
export async function sendEmail({ recipients, subject, message, attachments = [] }) {
  if (!EMAIL_FUNCTION_URL) {
    throw new ApiError('Email function is not configured. Set VITE_EMAIL_FUNCTION_URL.', {
      status: 503,
      details: null,
    })
  }
  if (!auth.currentUser) {
    throw new ApiError('You must be signed in to send email.', { status: 401, details: null })
  }

  const token = await auth.currentUser.getIdToken(true)
  // Encode attachments for the JSON request.
  const attachmentPayload = await Promise.all(attachments.map(fileToAttachment))

  let response
  try {
    response = await fetch(EMAIL_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'broadcast',
        recipients: (recipients || []).map((r) => ({ email: r.email })),
        subject,
        message,
        ...(attachmentPayload.length > 0 ? { attachments: attachmentPayload } : {}),
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

  return payload ?? null
}

// Sends a project email through the API.
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

// Gets the participants for a project.
export async function getProjectParticipants(projectId) {
  return apiRequest(`/api/email/projects/${projectId}/participants`)
}
