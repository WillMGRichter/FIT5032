<script setup>
import PlantCard from './PlantCard.vue'

defineProps({
  plants: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  headingId: { type: String, default: 'project-plants-title' },
})
</script>

<template>
  <section class="project-plants" :aria-labelledby="headingId">
    <h2 :id="headingId" class="project-plants__title">Native plants in this project</h2>

    <p v-if="isLoading" class="project-plants__state">Loading plants&hellip;</p>

    <p v-else-if="error" role="alert" class="project-plants__state project-plants__state--error">
      {{ error }}
    </p>

    <p v-else-if="plants.length === 0" class="project-plants__state">
      This project hasn't listed any native plants yet.
    </p>

    <ul v-else class="project-plants__grid">
      <li v-for="plant in plants" :key="plant.id" class="project-plants__item">
        <PlantCard :plant="plant" :quantity="plant.quantity ?? null" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.project-plants {
  margin-block-start: var(--spacing-xl);
}

.project-plants__title {
  font-size: var(--font-size-lg);
  margin-block-end: var(--spacing-md);
}

.project-plants__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: var(--spacing-lg);
}

.project-plants__item {
  display: flex;
}

.project-plants__state {
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
}

.project-plants__state--error {
  border-color: var(--color-error);
  color: var(--color-error);
}
</style>
