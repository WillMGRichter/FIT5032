import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  linkWithCredential,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from './firebase'
import { apiRequest } from './api'

const PROVIDERS = {
  google: () => new GoogleAuthProvider(),
}

function nameFrom(user) {
  const email = user.email ?? ''
  const parts = (user.displayName ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || email.split('@')[0] || 'GreenLink',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : 'User',
  }
}

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

export async function loginWithProvider(providerId) {
  const createProvider = PROVIDERS[providerId]
  if (!createProvider) throw new Error(`Unsupported sign-in provider: ${providerId}`)

  let result
  try {
    result = await signInWithPopup(auth, createProvider())
  } catch (err) {
    if (err?.code === 'auth/account-exists-with-different-credential') {
      const conflict = new Error('account-exists-with-different-credential')
      conflict.code = err.code
      conflict.providerId = providerId
      conflict.email = err.customData?.email ?? ''
      conflict.pendingCredential = GoogleAuthProvider.credentialFromError(err)
      throw conflict
    }
    throw err
  }

  const data = await apiRequest('/api/auth/sync', {
    method: 'POST',
    body: nameFrom(result.user),
  })
  return data?.user ?? null
}

export async function linkProviderAccount({ email, password, pendingCredential }) {
  if (!pendingCredential) {
    throw new Error('The sign-in attempt expired. Please try signing in with Google again.')
  }
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  await linkWithCredential(user, pendingCredential)
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

export async function updateInterests(interests) {
  const data = await apiRequest('/api/auth/preferences', { method: 'PUT', body: { interests } })
  return data.user
}

export async function getMyProjects() {
  const data = await apiRequest('/api/auth/me/projects')
  return { created: data?.created ?? [], joined: data?.joined ?? [] }
}

export async function getMyRatings() {
  const data = await apiRequest('/api/auth/me/ratings')
  return data ?? []
}
