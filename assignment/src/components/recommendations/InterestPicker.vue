<script setup>
import { ref } from 'vue'
import { INTERESTS } from '@/services/recommendationService'
import { updateInterests } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const emit = defineEmits(['saved'])

const authStore = useAuthStore()

const selected = ref([...new Set((authStore.state.user?.interests ?? []).filter(Boolean))])

const isSaving = ref(false)
const message = ref('')
const error = ref('')

function isSelected(id) {
  return selected.value.includes(id)
}

function toggleInterest(id) {
  message.value = ''
  error.value = ''
  selected.value = isSelected(id)
    ? selected.value.filter((item) => item !== id)
    : [...selected.value, id]
}

async function save() {
  if (isSaving.value) return
  isSaving.value = true
  message.value = ''
  error.value = ''
  try {
    const updated = await updateInterests(selected.value)
    authStore.updateUser(updated)
    message.value = 'Preferences saved — your recommendations will update.'
    emit('saved')
  } catch (err) {
    error.value = err instanceof Error && err.message ? err.message : 'Could not save preferences.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <fieldset class="interest-picker">
    <legend class="interest-picker__legend">What are you interested in? (optional)</legend>
    <p class="interest-picker__hint">
      Pick any that appeal to you. These are used to rank "Projects For You".
    </p>

    <div class="interest-picker__options">
      <label
        v-for="interest in INTERESTS"
        :key="interest.id"
        class="interest-picker__option"
        :class="{ 'interest-picker__option--checked': isSelected(interest.id) }"
      >
        <input
          type="checkbox"
          :checked="isSelected(interest.id)"
          @change="toggleInterest(interest.id)"
        />
        <span>{{ interest.label }}</span>
      </label>
    </div>

    <div class="interest-picker__actions">
      <button type="button" class="interest-picker__save" :disabled="isSaving" @click="save">
        {{ isSaving ? 'Saving\u2026' : 'Save preferences' }}
      </button>
      <p v-if="message" role="status" class="interest-picker__message">{{ message }}</p>
      <p v-if="error" role="alert" class="interest-picker__error">{{ error }}</p>
    </div>
  </fieldset>
</template>

<style scoped>
.interest-picker {
  margin: 0;
  padding: 0;
  border: 0;
}

.interest-picker__legend {
  padding: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.interest-picker__hint {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.interest-picker__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-sm);
  margin-block-start: var(--spacing-md);
}

.interest-picker__option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.interest-picker__option:hover {
  border-color: var(--color-primary);
}

.interest-picker__option--checked {
  border-color: var(--color-primary);
  background-color: #f0f7f0;
}

.interest-picker__option input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.interest-picker__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-block-start: var(--spacing-md);
  flex-wrap: wrap;
}

.interest-picker__save {
  min-height: 40px;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.interest-picker__save:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.interest-picker__save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.interest-picker__message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-success);
}

.interest-picker__error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error);
}
</style>