import { computed, reactive } from 'vue'
import * as authService from '@/services/authService'
import * as notificationService from '@/services/notificationService'

const state = reactive({
  user: null,
  firebaseUser: null,
  status: 'idle',
  unreadCount: 0,
})

const isAuthenticated = computed(() => state.user !== null)
const isLoading = computed(() => state.status === 'loading')

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
      unsubscribe()
      resolve()
    })
  })
}

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

async function register(userData) {
  const user = await authService.register(userData)
  state.user = user
  state.firebaseUser = { uid: user.firebaseUid, email: user.email }
  state.unreadCount = 0
  return user
}

async function logout() {
  try {
    await authService.logout()
  } finally {
    state.user = null
    state.firebaseUser = null
    state.unreadCount = 0
  }
}

function updateUser(user) {
  state.user = user
}

function refreshUnreadCount() {
  if (!state.user) return
  notificationService.getUnreadCount().then((result) => {
    state.unreadCount = result.count
  }).catch(() => {})
}

export function useAuthStore() {
  return {
    state,
    isAuthenticated,
    isLoading,
    init,
    login,
    register,
    logout,
    updateUser,
    refreshUnreadCount,
  }
}
