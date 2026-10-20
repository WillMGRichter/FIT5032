<script setup>
import { ref } from 'vue'
import FormInput from '@/components/forms/FormInput.vue'
import { useAuthStore } from '@/stores/authStore'

defineProps({
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['success', 'error'])

const authStore = useAuthStore()

const loadingProvider = ref(null)
const conflict = ref(null)
const linkPassword = ref('')
const linkError = ref('')
const isLinking = ref(false)

// Converts Firebase errors into sign-in messages.
function friendlyError(err) {
  const map = {
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup. Please allow popups and try again.',
    'auth/operation-not-allowed': 'Google sign-in is not enabled. Please contact support.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
  }
  if (err?.code && map[err.code]) return map[err.code]
  if (err?.status === 0) {
    return 'Could not reach the GreenLink API. Check your connection and try again.'
  }
  return err?.message || 'Something went wrong while signing you in.'
}

// Starts Google sign-in.
async function signInWithGoogle() {
  if (loadingProvider.value || conflict.value) return
  loadingProvider.value = 'google'
  try {
    const user = await authStore.loginWithProvider('google')
    emit('success', user)
  } catch (err) {
    if (err?.code === 'auth/account-exists-with-different-credential' && err.pendingCredential) {
      // Prompt for the existing account password.
      conflict.value = { email: err.email, pendingCredential: err.pendingCredential }
      linkPassword.value = ''
      linkError.value = ''
    } else {
      emit('error', friendlyError(err))
    }
  } finally {
    loadingProvider.value = null
  }
}

// Clears the account-linking form.
function cancelLink() {
  conflict.value = null
  linkPassword.value = ''
  linkError.value = ''
}

// Links Google after the existing password is confirmed.
async function handleLinkSubmit() {
  if (isLinking.value) return
  linkError.value = ''
  if (!linkPassword.value) {
    linkError.value = 'Please enter your password.'
    return
  }

  isLinking.value = true
  try {
    const user = await authStore.linkProviderAccount({
      email: conflict.value.email,
      password: linkPassword.value,
      pendingCredential: conflict.value.pendingCredential,
    })
    conflict.value = null
    linkPassword.value = ''
    emit('success', user)
  } catch (err) {
    if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
      linkError.value = 'Incorrect password. Please try again.'
    } else if (err?.code === 'auth/too-many-requests') {
      linkError.value = 'Too many attempts. Please try again later.'
    } else if (err?.code === 'auth/credential-already-in-use') {
      linkError.value = 'This Google account is already linked to another user.'
    } else {
      linkError.value = err?.message || 'Could not link your account. Please try again.'
    }
  } finally {
    isLinking.value = false
  }
}
</script>

<template>
  <div class="social">
    <!-- Existing account password form -->
    <template v-if="conflict">
      <div class="social__link">
        <h2 class="social__link-title">Link your Google account</h2>
        <p class="social__link-text">
          An account already exists for <strong>{{ conflict.email }}</strong
          >. Enter your password to link Google sign-in to it.
        </p>

        <form class="social__link-form" novalidate @submit.prevent="handleLinkSubmit">
          <FormInput
            id="social-link-password"
            :model-value="linkPassword"
            label="Password"
            type="password"
            autocomplete="current-password"
            required
            :disabled="isLinking"
            :error="linkError"
            @update:model-value="linkPassword = $event"
          />

          <div class="social__link-actions">
            <button type="submit" class="social__button" :disabled="isLinking">
              {{ isLinking ? 'Linking…' : 'Link account' }}
            </button>
            <button type="button" class="social__cancel" :disabled="isLinking" @click="cancelLink">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </template>

    <!-- Google sign-in button -->
    <template v-else>
      <div class="social__divider" role="presentation">
        <span>or continue with</span>
      </div>

      <button
        type="button"
        class="social__button"
        :disabled="disabled || loadingProvider !== null"
        @click="signInWithGoogle"
      >
        <svg class="social__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 5.04c1.66 0 3.14.57 4.31 1.69l3.22-3.22C17.45 1.68 14.97.75 12 .75 7.7.75 3.99 3.22 2.18 6.8l3.75 2.91C6.84 7.02 9.2 5.04 12 5.04Z"
          />
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.13 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
          />
          <path
            fill="#FBBC05"
            d="M5.93 14.71a6.9 6.9 0 0 1 0-4.42L2.18 7.38a11.25 11.25 0 0 0 0 9.24l3.75-2.91Z"
          />
          <path
            fill="#34A853"
            d="M12 23.25c3.04 0 5.59-1.01 7.45-2.73l-3.86-3c-1.03.69-2.35 1.1-3.59 1.1-2.8 0-5.16-1.98-6.07-4.67l-3.75 2.91C3.99 20.78 7.7 23.25 12 23.25Z"
          />
        </svg>
        <span>{{ loadingProvider === 'google' ? 'Connecting…' : 'Continue with Google' }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.social {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.social__divider {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.social__divider::before,
.social__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: var(--color-border);
}

.social__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-xl);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

.social__button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.social__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.social__icon {
  flex-shrink: 0;
}

.social__link {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
}

.social__link-title {
  margin: 0;
  font-size: var(--font-size-lg);
}

.social__link-text {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.social__link-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.social__link-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.social__link-actions .social__button {
  flex: 1;
}

.social__cancel {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.social__cancel:hover:not(:disabled) {
  color: var(--color-text);
}
</style>
