const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000'

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message, details ? { cause: details } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

function buildUrl(path, query) {
  const url = new URL(`${BASE_URL.replace(/\/+$/, '')}${path}`)
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  }
  return url
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = buildUrl(path, query)

  const fetchOptions = { method, credentials: 'include' }
  if (body !== undefined) {
    fetchOptions.headers = { 'Content-Type': 'application/json' }
    fetchOptions.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(url, fetchOptions)
  } catch (details) {
    throw new ApiError(`Unable to reach the GreenLink API at ${url.origin}`, { status: 0, details })
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(payload?.error || `Request failed: ${method} ${path}`, {
      status: response.status,
      details: payload ?? null,
    })
  }

  return payload === null || payload === undefined ? null : payload.data
}

export { request as apiRequest, BASE_URL as API_BASE_URL }
