import { computed, reactive } from 'vue'
import * as authService from '@/services/authService'
import * as notificationService from '@/services/notificationService'

const state = reactive({
  user: null,
  firebaseUser: null,
  status: 'idle',
  unreadCount: 0,
})

// Checks whether a user is signed in.
const isAuthenticated = computed(() => state.user !== null)
// Checks whether the session is loading.
const isLoading = computed(() => state.status === 'loading')

// Loads the initial Firebase session and unread count.
async function init() {
  if (state.status === 'ready') return
  state.status = 'loading'

  return new Promise((resolve) => {
    const unsubscribe = authService.onAuthChange(async (firebaseUser) => {
      state.firebaseUser = firebaseUser
      if (firebaseUser) {
        try {
          state.user = await authService.getCurrentUser()
        } catch {
          state.user = null
        }
        try {
          const result = await notificationService.getUnreadCount()
          state.unreadCount = result.count
        } catch {
          state.unreadCount = 0
        }
      } else {
        state.user = null
        state.unreadCount = 0
      }
      state.status = 'ready'
      // Read the initial session once.
      unsubscribe()
      resolve()
    })
  })
}

// Signs in and updates shared auth state.
async function login(credentials) {
  const user = await authService.login(credentials)
  state.user = user
  state.firebaseUser = { uid: user.firebaseUid, email: user.email }
  try {
    const result = await notificationService.getUnreadCount()
    state.unreadCount = result.count
  } catch {
    state.unreadCount = 0
  }
  return user
}

// Registers a user and stores the new session.
async function register(userData) {
  const user = await authService.register(userData)
  state.user = user
  state.firebaseUser = { uid: user.firebaseUid, email: user.email }
  state.unreadCount = 0
  return user
}

// Signs in with a provider and updates shared auth state.
async function loginWithProvider(providerId) {
  const user = await authService.loginWithProvider(providerId)
  state.user = user
  state.firebaseUser = { uid: user.firebaseUid, email: user.email }
  try {
    const result = await notificationService.getUnreadCount()
    state.unreadCount = result.count
  } catch {
    state.unreadCount = 0
  }
  return user
}

// Links a provider and updates shared auth state.
async function linkProviderAccount(credentials) {
  const user = await authService.linkProviderAccount(credentials)
  state.user = user
  state.firebaseUser = { uid: user.firebaseUid, email: user.email }
  try {
    const result = await notificationService.getUnreadCount()
    state.unreadCount = result.count
  } catch {
    state.unreadCount = 0
  }
  return user
}

// Clears the session even if Firebase sign-out fails.
async function logout() {
  try {
    await authService.logout()
  } finally {
    state.user = null
    state.firebaseUser = null
    state.unreadCount = 0
  }
}

// Replaces the cached app profile.
function updateUser(user) {
  state.user = user
}

// Refreshes the notification badge count.
function refreshUnreadCount() {
  if (!state.user) return
  notificationService.getUnreadCount().then((result) => {
    state.unreadCount = result.count
  }).catch(() => {})
}

// Exposes shared authentication state and actions.
export function useAuthStore() {
  return {
    state,
    isAuthenticated,
    isLoading,
    init,
    login,
    register,
    loginWithProvider,
    linkProviderAccount,
    logout,
    updateUser,
    refreshUnreadCount,
  }
}
