import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from './firebase'
import { apiRequest } from './api'

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function register({ firstName, lastName, email, password }) {
  await createUserWithEmailAndPassword(auth, email, password)
  const data = await apiRequest('/api/auth/sync', {
    method: 'POST',
    body: { firstName, lastName },
  })
  return data?.user ?? null
}

export async function login({ email, password }) {
  await signInWithEmailAndPassword(auth, email, password)
  const data = await apiRequest('/api/auth/me')
  return data?.user ?? null
}

export async function logout() {
  await signOut(auth)
}

export async function getCurrentUser() {
  if (!auth.currentUser) return null
  const data = await apiRequest('/api/auth/me')
  return data?.user ?? null
}

export async function getProfile() {
  const data = await apiRequest('/api/auth/profile')
  return data.user
}

export async function updateProfile(profile) {
  const data = await apiRequest('/api/auth/profile', { method: 'PUT', body: profile })
  return data.user
}

export async function getMyProjects() {
  const data = await apiRequest('/api/auth/me/projects')
  return { created: data?.created ?? [], joined: data?.joined ?? [] }
}
