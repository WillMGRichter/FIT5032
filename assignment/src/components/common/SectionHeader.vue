<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  titleId: { type: String, default: '' },
  intro: { type: String, default: '' },
  centered: { type: Boolean, default: false },
})
</script>

<template>
  <header class="section-header" :class="{ 'section-header--centered': centered }">
    <p v-if="eyebrow" class="section-header__eyebrow">{{ eyebrow }}</p>
    <h2 :id="titleId || undefined" class="section-header__title">{{ title }}</h2>
    <p v-if="intro" class="section-header__intro">{{ intro }}</p>
  </header>
</template>

<style scoped>
.section-header {
  margin-block-end: var(--spacing-lg);
}

.section-header__eyebrow {
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.section-header__title {
  margin-top: var(--spacing-xs);
}

.section-header__intro {
  margin-top: var(--spacing-sm);
  max-width: 60ch;
  color: var(--color-text-secondary);
}

.section-header--centered .section-header__intro {
  margin-inline: auto;
}

.section-header--centered {
  text-align: center;
}

.section-header--centered .section-header__intro {
  max-width: 55ch;
}
</style>
