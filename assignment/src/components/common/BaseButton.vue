<script setup>
import { computed } from 'vue'

const props = defineProps({
  to: { type: [String, Object], default: undefined },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary'].includes(value),
  },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
})

defineEmits(['click'])

const isLink = computed(() => Boolean(props.to))
</script>

<template>
  <RouterLink
    v-if="isLink"
    :to="to"
    class="base-button"
    :class="[`base-button--${variant}`, { 'base-button--disabled': disabled }]"
    :aria-disabled="disabled"
    @click="disabled ? $event.preventDefault() : null"
  >
    <slot />
  </RouterLink>
  <button
    v-else
    :type="type"
    :disabled="disabled"
    class="base-button"
    :class="`base-button--${variant}`"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-xl);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.base-button--primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-surface);
}

.base-button--primary:hover:not(.base-button--disabled) {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.base-button--secondary {
  background-color: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.base-button--secondary:hover:not(.base-button--disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.base-button:disabled,
.base-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
