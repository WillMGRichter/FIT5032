<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  error: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="form-field" :class="{ 'form-field--error': Boolean(error) }">
    <label :for="id" class="form-field__label">
      {{ label }}
      <span v-if="required" class="form-field__required" aria-hidden="true">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="form-field__control"
      @input="$emit('update:modelValue', $event.target.value)"
    />
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
