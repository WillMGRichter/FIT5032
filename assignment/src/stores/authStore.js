import { computed, reactive } from 'vue'
import * as authService from '@/services/authService'

const state = reactive({
  user: null,
  status: 'idle',
})

const isAuthenticated = computed(() => state.user !== null)
const isLoading = computed(() => state.status === 'loading')

async function init() {
  if (state.status === 'ready') return
  state.status = 'loading'
  try {
    state.user = await authService.getCurrentUser()
  } catch {
    state.user = null
  } finally {
    state.status = 'ready'
  }
}

async function login(credentials) {
  const data = await authService.login(credentials)
  state.user = data.user
  return data.user
}

async function register(user) {
  const data = await authService.register(user)
  state.user = data.user
  return data.user
}

async function logout() {
  try {
    await authService.logout()
  } finally {
    state.user = null
  }
}

export function useAuthStore() {
  return { state, isAuthenticated, isLoading, init, login, register, logout }
}
