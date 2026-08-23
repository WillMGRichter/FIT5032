<script setup>
import AppIcon from '@/components/common/AppIcon.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'

const steps = [
  {
    icon: 'search',
    title: 'Discover projects',
    text: 'Browse greening projects across Melbourne and find one that matches your interests and schedule.',
  },
  {
    icon: 'users',
    title: 'Join a planting day',
    text: 'Sign up as a volunteer, meet your neighbours, and get hands-on with habitat restoration.',
  },
  {
    icon: 'sprout',
    title: 'Watch it grow',
    text: 'Follow each project from plan to planting and see the lasting impact on your community.',
  },
]
</script>

<template>
  <section aria-labelledby="how-it-works-title">
    <SectionHeader
      centered
      eyebrow="How GreenLink works"
      title="Three steps to greener streets"
      intro="GreenLink makes it easy to turn good intentions into trees in the ground."
    />
    <ol class="steps">
      <li v-for="(step, index) in steps" :key="step.title" class="steps__item">
        <span class="steps__number" aria-hidden="true">{{ index + 1 }}</span>
        <AppIcon :name="step.icon" :size="28" class="steps__icon" />
        <h3 class="steps__title">{{ step.title }}</h3>
        <p class="steps__text">{{ step.text }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.steps {
  display: grid;
  gap: var(--spacing-lg);
  counter-reset: step;
}

@media (min-width: 768px) {
  .steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.steps__item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.steps__number {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background-color: var(--color-background);
  color: var(--color-primary-dark);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.steps__icon {
  color: var(--color-primary);
}

.steps__title {
  font-size: var(--font-size-lg);
}

.steps__text {
  margin-block-end: 0;
  color: var(--color-text-secondary);
}
</style>
