<script setup>
import AppIcon from '@/components/common/AppIcon.vue'
import BaseButton from '@/components/common/BaseButton.vue'
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="container hero__inner">
      <div class="hero__content">
        <p class="hero__eyebrow">Melbourne's urban greening community</p>
        <h1 id="hero-title">Grow a greener city, one project at a time</h1>
        <p class="hero__intro">
          GreenLink connects volunteers with hands-on greening projects across Melbourne &mdash;
          from native planting days to canopy restoration in your local neighbourhood.
        </p>
        <div class="hero__actions">
          <BaseButton :to="{ name: 'discover' }">Explore projects</BaseButton>
          <BaseButton :to="{ name: 'about' }" variant="secondary">About GreenLink</BaseButton>
        </div>
      </div>

      <div class="hero__art" aria-hidden="true">
        <AppIcon name="leaf" :size="200" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  color: var(--color-surface);
}

.hero__inner {
  display: grid;
  gap: var(--spacing-xl);
  padding-block: var(--spacing-2xl);
}

@media (min-width: 992px) {
  .hero__inner {
    grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
    align-items: center;
    padding-block: var(--spacing-3xl);
  }
}

.hero__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.hero__eyebrow {
  color: var(--color-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero h1 {
  color: var(--color-surface);
  max-width: 20ch;
}

.hero__intro {
  max-width: 55ch;
  color: rgba(255, 255, 255, 0.88);
  margin-block-end: 0;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
}

.hero :deep(.base-button--secondary) {
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.6);
  color: var(--color-surface);
}

.hero :deep(.base-button--secondary:hover) {
  border-color: var(--color-surface);
  color: var(--color-surface);
  background-color: rgba(255, 255, 255, 0.12);
}

.hero__art {
  display: none;
  justify-content: center;
}

@media (min-width: 768px) {
  .hero__art {
    display: flex;
    opacity: 0.35;
  }
}
</style>
