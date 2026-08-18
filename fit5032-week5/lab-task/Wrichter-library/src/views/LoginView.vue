<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-12 col-sm-8 col-md-6 col-lg-4">
        <h1 class="text-center mb-4">Login</h1>

        <div v-if="error" class="alert alert-danger" role="alert">
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label for="username" class="form-label">Username</label>
            <input
              type="text"
              class="form-control"
              id="username"
              v-model="username"
              required
            />
          </div>

          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input
              type="password"
              class="form-control"
              id="password"
              v-model="password"
              required
            />
          </div>

          <button type="submit" class="btn btn-primary w-100">
            Login
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAuthenticated } from '../auth.js'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')

const VALID_USERNAME = 'admin'
const VALID_PASSWORD = 'password123'

const handleLogin = () => {
  if (username.value === VALID_USERNAME && password.value === VALID_PASSWORD) {
    isAuthenticated.value = true
    error.value = ''
    router.push('/about')
  } else {
    error.value = 'Invalid username or password.'
  }
}
</script>
