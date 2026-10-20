// BR (D.1) External Authentication:
// BR (F.1) Innovation:
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

// Gets a display name for a new provider account.
function nameFrom(user) {
  const email = user.email ?? ''
  const parts = (user.displayName ?? '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || email.split('@')[0] || 'GreenLink',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : 'User',
  }
}

// Subscribes to Firebase sign-in changes.
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

// Registers a user and creates their app profile.
export async function register({ firstName, lastName, email, password }) {
  await createUserWithEmailAndPassword(auth, email, password)
  // Add the GreenLink profile after Firebase sign-up.
  const data = await apiRequest('/api/auth/sync', {
    method: 'POST',
    body: { firstName, lastName },
  })
  return data?.user ?? null
}

// Signs in with an email and password.
export async function login({ email, password }) {
  await signInWithEmailAndPassword(auth, email, password)
  const data = await apiRequest('/api/auth/me')
  return data?.user ?? null
}

// Signs in with an external provider.
export async function loginWithProvider(providerId) {
  const createProvider = PROVIDERS[providerId]
  if (!createProvider) throw new Error(`Unsupported sign-in provider: ${providerId}`)

  let result
  try {
    result = await signInWithPopup(auth, createProvider())
  } catch (err) {
    if (err?.code === 'auth/account-exists-with-different-credential') {
      // Save the pending Google credential for account linking.
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

// Links a provider to an existing password account.
export async function linkProviderAccount({ email, password, pendingCredential }) {
  if (!pendingCredential) {
    throw new Error('The sign-in attempt expired. Please try signing in with Google again.')
  }
  // Confirm the password before linking another sign-in method.
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  await linkWithCredential(user, pendingCredential)
  const data = await apiRequest('/api/auth/me')
  return data?.user ?? null
}

// Signs out the current Firebase user.
export async function logout() {
  await signOut(auth)
}

// Gets the signed-in user's app profile.
export async function getCurrentUser() {
  if (!auth.currentUser) return null
  const data = await apiRequest('/api/auth/me')
  return data?.user ?? null
}

// Gets the current user's profile details.
export async function getProfile() {
  const data = await apiRequest('/api/auth/profile')
  return data.user
}

// Saves profile changes.
export async function updateProfile(profile) {
  const data = await apiRequest('/api/auth/profile', { method: 'PUT', body: profile })
  return data.user
}

// Saves recommendation interests.
export async function updateInterests(interests) {
  const data = await apiRequest('/api/auth/preferences', { method: 'PUT', body: { interests } })
  return data.user
}

// Gets projects created or joined by the user.
export async function getMyProjects() {
  const data = await apiRequest('/api/auth/me/projects')
  return { created: data?.created ?? [], joined: data?.joined ?? [] }
}

// Gets ratings submitted by the user.
export async function getMyRatings() {
  const data = await apiRequest('/api/auth/me/ratings')
  return data ?? []
}
