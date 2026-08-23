import { apiRequest } from './api'

export async function register(user) {
  return apiRequest('/api/auth/register', { method: 'POST', body: user })
}

export async function login(credentials) {
  return apiRequest('/api/auth/login', { method: 'POST', body: credentials })
}

export async function logout() {
  return apiRequest('/api/auth/logout', { method: 'POST' })
}

export async function getCurrentUser() {
  const data = await apiRequest('/api/auth/me')
  return data?.user ?? null
}
