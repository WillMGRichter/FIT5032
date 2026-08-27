import { computed, reactive } from 'vue'
import * as authService from '@/services/authService'
import * as notificationService from '@/services/notificationService'

const state = reactive({
  user: null,
  status: 'idle',
  unreadCount: 0,
})

const isAuthenticated = computed(() => state.user !== null)
const isLoading = computed(() => state.status === 'loading')

async function init() {
  if (state.status === 'ready') return
  state.status = 'loading'
  try {
    state.user = await authService.getCurrentUser()
    if (state.user) {
      const result = await notificationService.getUnreadCount()
      state.unreadCount = result.count
    }
  } catch {
    state.user = null
  } finally {
    state.status = 'ready'
  }
}

async function login(credentials) {
  const data = await authService.login(credentials)
  state.user = data.user
  const result = await notificationService.getUnreadCount()
  state.unreadCount = result.count
  return data.user
}

async function register(user) {
  const data = await authService.register(user)
  state.user = data.user
  state.unreadCount = 0
  return data.user
}

async function logout() {
  try {
    await authService.logout()
  } finally {
    state.user = null
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
