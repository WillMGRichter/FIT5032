import { apiRequest, ApiError } from './api.js'
import { auth } from './firebase.js'

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000'

export async function sendEmail({ recipients, subject, message, attachments = [] }) {
  const formData = new FormData()
  formData.append('recipients', JSON.stringify(recipients))
  formData.append('subject', subject)
  formData.append('message', message)
  for (const file of attachments) {
    formData.append('attachments', file)
  }

  const url = new URL(`${BASE_URL.replace(/\/+$/, '')}/api/email/send`)
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
