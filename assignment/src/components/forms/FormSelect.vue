<script setup>
import { computed } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: String, default: '' },
  error: { type: String, default: '' },
  placeholder: { type: String, default: 'Please select an option' },
  options: { type: Array, default: () => [] },
  required: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])

const hasPlaceholder = computed(() => props.placeholder !== '')
</script>

<template>
  <div class="form-field" :class="{ 'form-field--error': Boolean(error) }">
    <label :for="id" class="form-field__label">
      {{ label }}
      <span v-if="required" class="form-field__required" aria-hidden="true">*</span>
    </label>
    <select
      :id="id"
      :value="modelValue"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="form-field__control"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="hasPlaceholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" :id="`${id}-error`" class="form-field__message">{{ error }}</p>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.form-field__required {
  color: var(--color-error);
}

.form-field__control {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  min-width: 0;
}

.form-field--error .form-field__control {
  border-color: var(--color-error);
}

.form-field__message {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}
</style>
