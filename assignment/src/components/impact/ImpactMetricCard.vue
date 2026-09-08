<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'highlight', 'muted'].includes(value),
  },
})
</script>

<template>
  <article
    class="impact-metric-card"
    :class="`impact-metric-card--${tone}`"
  >
    <p class="impact-metric-card__value">{{ value }}</p>
    <h3 class="impact-metric-card__label">{{ label }}</h3>
    <p v-if="hint" class="impact-metric-card__hint">{{ hint }}</p>
  </article>
</template>

<style scoped>
.impact-metric-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.impact-metric-card__value {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
  color: var(--color-primary-dark);
}

.impact-metric-card__label {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text);
}

.impact-metric-card__hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.impact-metric-card--highlight {
  border-color: var(--color-primary-light);
  background-color: #f0f7f0;
}

.impact-metric-card--muted .impact-metric-card__value {
  color: var(--color-text-secondary);
}
</style>