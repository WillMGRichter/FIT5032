<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormInput from '@/components/forms/FormInput.vue'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const form = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

const isSubmitting = ref(false)
const submitError = ref(null)

function validateField(field) {
  switch (field) {
    case 'email':
      errors.email = !form.email.trim()
        ? 'Email is required.'
        : !EMAIL_PATTERN.test(form.email.trim())
          ? 'Please enter a valid email address.'
          : ''
      break
    case 'password':
      errors.password = !form.password ? 'Password is required.' : ''
      break
  }
}

function onFieldUpdate({ field, value }) {
  form[field] = value
  validateField(field)
  submitError.value = null
}

async function handleSubmit() {
  if (isSubmitting.value) return

  submitError.value = null
  validateField('email')
  validateField('password')
  if (errors.email || errors.password) {
    return
  }

  isSubmitting.value = true
  try {
    await authStore.login({
      email: form.email.trim(),
      password: form.password,
    })

    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/'
    router.push(redirect)
  } catch (err) {
    if (err instanceof ApiError && err.status === 400 && err.details?.errors) {
      for (const [field, message] of Object.entries(err.details.errors)) {
        if (field in errors) errors[field] = message
      }
    } else if (err instanceof ApiError && err.status === 401) {
      submitError.value = 'Invalid email or password. Please try again.'
    } else if (err instanceof ApiError && err.status === 0) {
      submitError.value = 'Could not reach the GreenLink API. Check your connection and try again.'
    } else {
      submitError.value =
        err && err.message ? err.message : 'Something went wrong while logging you in.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="login" aria-labelledby="login-heading">
    <header class="login__header">
      <h1 id="login-heading">Log in</h1>
      <p class="login__intro">
        Welcome back &mdash; sign in to join projects and track your impact.
      </p>
    </header>

    <form class="login__form" novalidate @submit.prevent="handleSubmit">
      <FormInput
        id="login-email"
        :model-value="form.email"
        label="Email"
        type="email"
        autocomplete="email"
        required
        placeholder="you@example.com"
        :error="errors.email"
        @update:model-value="onFieldUpdate({ field: 'email', value: $event })"
      />

      <FormInput
        id="login-password"
        :model-value="form.password"
        label="Password"
        type="password"
        autocomplete="current-password"
        required
        :error="errors.password"
        @update:model-value="onFieldUpdate({ field: 'password', value: $event })"
      />

      <div v-if="submitError" role="alert" class="login__alert">{{ submitError }}</div>

      <button type="submit" class="login__submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Logging in…' : 'Log in' }}
      </button>

      <p class="login__switch">
        New to GreenLink?
        <RouterLink :to="{ name: 'register' }">Create an account</RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.login {
  max-width: 480px;
  margin-inline: auto;
}

.login__header {
  margin-block-end: var(--spacing-xl);
}

.login__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.login__alert {
  padding: var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
}

.login__submit {
  padding: var(--spacing-md) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.login__submit:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.login__submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.login__switch {
  margin-block-end: 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.login__switch a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
</style>
