<script setup>
import FormError from './FormError.vue'

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  name: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])

function isSelected(value) {
  return props.modelValue.includes(value)
}

function toggle(value) {
  const next = isSelected(value)
    ? props.modelValue.filter((item) => item !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', next)
}
</script>

<template>
  <fieldset class="checkbox-group" :disabled="disabled">
    <legend class="checkbox-group__label">
      {{ label }}
    </legend>
    <div class="checkbox-group__options">
      <label
        v-for="option in options"
        :key="option.value"
        class="checkbox-group__option"
        :class="{ 'checkbox-group__option--selected': isSelected(option.value) }"
      >
        <input
          type="checkbox"
          :name="name"
          :value="option.value"
          :checked="isSelected(option.value)"
          class="checkbox-group__input"
          @change="toggle(option.value)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
    <FormError :message="error" />
  </fieldset>
</template>

<style scoped>
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin: 0;
  padding: 0;
  border: none;
}

.checkbox-group__label {
  padding: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.checkbox-group__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.checkbox-group__option {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.checkbox-group__option--selected {
  border-color: var(--color-primary);
  background-color: var(--color-background);
  color: var(--color-primary-dark);
  font-weight: var(--font-weight-semibold);
}

.checkbox-group__option:has(.checkbox-group__input:focus-visible) {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.checkbox-group__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.checkbox-group__option--selected::before {
  content: '\2713';
  margin-right: var(--spacing-sm);
  font-weight: var(--font-weight-bold);
}
</style>
