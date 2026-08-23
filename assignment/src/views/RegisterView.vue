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
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const isSubmitting = ref(false)
const submitError = ref(null)
const isSuccess = ref(false)

function validateField(field) {
  switch (field) {
    case 'firstName':
      errors.firstName = !form.firstName.trim()
        ? 'First name is required.'
        : form.firstName.trim().length > 60
          ? 'First name must be 60 characters or fewer.'
          : ''
      break
    case 'lastName':
      errors.lastName = !form.lastName.trim()
        ? 'Last name is required.'
        : form.lastName.trim().length > 60
          ? 'Last name must be 60 characters or fewer.'
          : ''
      break
    case 'email':
      errors.email = !form.email.trim()
        ? 'Email is required.'
        : !EMAIL_PATTERN.test(form.email.trim())
          ? 'Please enter a valid email address.'
          : ''
      break
    case 'password': {
      if (!form.password) {
        errors.password = 'Password is required.'
      } else if (form.password.length < 8) {
        errors.password = 'Password must be at least 8 characters.'
      } else if (form.password.length > 100) {
        errors.password = 'Password must be 100 characters or fewer.'
      } else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
        errors.password = 'Password must contain at least one letter and one number.'
      } else {
        errors.password = ''
      }
      break
    }
    case 'confirmPassword':
      errors.confirmPassword =
        !form.confirmPassword && Boolean(form.password)
          ? 'Please confirm your password.'
          : form.confirmPassword !== form.password
            ? 'Passwords do not match.'
            : ''
      break
  }
}

function onFieldUpdate({ field, value }) {
  form[field] = value
  validateField(field)
  if (field === 'password' && form.confirmPassword) validateField('confirmPassword')
  submitError.value = null
}

function applyServerErrors(serverErrors) {
  for (const [field, message] of Object.entries(serverErrors)) {
    if (field in errors) {
      errors[field] = message
    }
  }
}

async function handleSubmit() {
  if (isSubmitting.value || isSuccess.value) return

  submitError.value = null
  const fields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword']
  fields.forEach(validateField)
  if (fields.some((field) => errors[field])) {
    submitError.value = 'Please fix the highlighted fields and try again.'
    return
  }

  isSubmitting.value = true
  try {
    await authStore.register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
    })

    isSuccess.value = true
    setTimeout(() => {
      router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
    }, 1000)
  } catch (err) {
    if (err instanceof ApiError && err.details?.errors) {
      applyServerErrors(err.details.errors)
      submitError.value = 'Please review the highlighted fields.'
    } else {
      submitError.value =
        err && err.message ? err.message : 'Something went wrong while creating your account.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="register" aria-labelledby="register-heading">
    <header class="register__header">
      <h1 id="register-heading">Create your account</h1>
      <p class="register__intro">
        Join GreenLink to take part in greening projects across Melbourne.
      </p>
    </header>

    <div v-if="isSuccess" role="status" class="register__success">
      <h2>Welcome to GreenLink!</h2>
      <p>You're all signed in &mdash; taking you to the home page&hellip;</p>
    </div>

    <form v-else class="register__form" novalidate @submit.prevent="handleSubmit">
      <div class="register__row">
        <FormInput
          id="register-first-name"
          :model-value="form.firstName"
          label="First name"
          type="text"
          autocomplete="given-name"
          required
          :error="errors.firstName"
          @update:model-value="onFieldUpdate({ field: 'firstName', value: $event })"
        />
        <FormInput
          id="register-last-name"
          :model-value="form.lastName"
          label="Last name"
          type="text"
          autocomplete="family-name"
          required
          :error="errors.lastName"
          @update:model-value="onFieldUpdate({ field: 'lastName', value: $event })"
        />
      </div>

      <FormInput
        id="register-email"
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
        id="register-password"
        :model-value="form.password"
        label="Password"
        type="password"
        autocomplete="new-password"
        required
        placeholder="At least 8 characters with a letter and a number"
        :error="errors.password"
        @update:model-value="onFieldUpdate({ field: 'password', value: $event })"
      />

      <FormInput
        id="register-confirm-password"
        :model-value="form.confirmPassword"
        label="Confirm password"
        type="password"
        autocomplete="new-password"
        required
        :error="errors.confirmPassword"
        @update:model-value="onFieldUpdate({ field: 'confirmPassword', value: $event })"
      />

      <div v-if="submitError" role="alert" class="register__alert">{{ submitError }}</div>

      <button type="submit" class="register__submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Creating account…' : 'Create account' }}
      </button>

      <p class="register__switch">
        Already have an account?
        <RouterLink :to="{ name: 'login' }">Log in</RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.register {
  max-width: 560px;
  margin-inline: auto;
}

.register__header {
  margin-block-end: var(--spacing-xl);
}

.register__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.register__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.register__row {
  display: grid;
  gap: var(--spacing-md);
}

@media (min-width: 576px) {
  .register__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.register__success {
  padding: var(--spacing-xl);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
  color: var(--color-success);
}

.register__success h2 {
  font-size: var(--font-size-lg);
}

.register__alert {
  padding: var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
}

.register__submit {
  padding: var(--spacing-md) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.register__submit:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.register__submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.register__switch {
  margin-block-end: 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.register__switch a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
</style>
