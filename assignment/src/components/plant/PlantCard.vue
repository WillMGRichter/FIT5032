<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  plant: {
    type: Object,
    required: true,
  },
  quantity: {
    type: [Number, String],
    default: null,
  },
})

const imageFailed = ref(false)

function onImageError() {
  imageFailed.value = true
}
</script>

<template>
  <article class="plant-card">
    <div class="plant-card__media">
      <img
        v-if="plant.image && !imageFailed"
        :src="plant.image"
        :alt="plant.commonName"
        class="plant-card__image"
        loading="lazy"
        @error="onImageError"
      />
      <div v-else class="plant-card__media-fallback" aria-hidden="true">
        <AppIcon name="leaf" :size="40" />
      </div>
      <span class="plant-card__maintenance" :data-level="plant.maintenanceLevel">
        {{ plant.maintenanceLevel }} maintenance
      </span>
      <span v-if="quantity != null" class="plant-card__quantity">&times;{{ quantity }}</span>
    </div>

    <div class="plant-card__body">
      <h2 class="plant-card__name">
        <RouterLink :to="{ name: 'plant-details', params: { id: plant.id } }">
          {{ plant.commonName }}
        </RouterLink>
      </h2>
      <p class="plant-card__scientific">{{ plant.scientificName }}</p>
      <p class="plant-card__description">{{ plant.description }}</p>
    </div>

    <footer class="plant-card__footer">
      <AppIcon name="map-pin" :size="16" class="plant-card__habitat-icon" />
      <span class="plant-card__habitat">{{ plant.habitat }}</span>
    </footer>
  </article>
</template>

<style scoped>
.plant-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.plant-card:hover {
  box-shadow: var(--shadow-md);
}

.plant-card:focus-within {
  box-shadow:
    0 0 0 2px var(--color-primary),
    var(--shadow-md);
}

.plant-card__name a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.plant-card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background-color: var(--color-border);
}

.plant-card__image,
.plant-card__media-fallback {
  width: 100%;
  height: 100%;
}

.plant-card__image {
  object-fit: cover;
}

.plant-card__media-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  color: rgba(255, 255, 255, 0.7);
}

.plant-card__maintenance {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.plant-card__maintenance[data-level='low'] {
  color: var(--color-success);
}

.plant-card__maintenance[data-level='medium'] {
  color: #8d6e00;
}

.plant-card__maintenance[data-level='high'] {
  color: var(--color-error);
}

.plant-card__quantity {
  position: absolute;
  bottom: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-dark);
}

.plant-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  flex-grow: 1;
}

.plant-card__name a {
  color: inherit;
}

.plant-card__name a:hover {
  color: var(--color-primary);
}

.plant-card__scientific {
  font-style: italic;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.plant-card__description {
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plant-card__footer {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.plant-card__habitat-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-text-light);
}

.plant-card__habitat {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
