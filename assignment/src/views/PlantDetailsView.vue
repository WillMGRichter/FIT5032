<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { getPlantById } from '@/services/plantService'

const route = useRoute()

const plant = ref(null)
const isLoading = ref(true)
const error = ref(null)
const imageFailed = ref(false)

async function loadPlant(id) {
  if (!id) return
  isLoading.value = true
  error.value = null
  plant.value = null
  imageFailed.value = false
  try {
    plant.value = await getPlantById(id)
  } catch (err) {
    error.value =
      err && err.message ? err.message : 'Something went wrong while loading this plant.'
    plant.value = null
  } finally {
    isLoading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => loadPlant(id),
  { immediate: true },
)

const maintenanceLabel = computed(() =>
  plant.value?.maintenanceLevel
    ? `${plant.value.maintenanceLevel.charAt(0).toUpperCase()}${plant.value.maintenanceLevel.slice(1)}`
    : '',
)
</script>

<template>
  <section class="plant-details">
    <nav class="plant-details__breadcrumb">
      <RouterLink :to="{ name: 'plants' }">&larr; Back to Native Plants</RouterLink>
    </nav>

    <p v-if="isLoading" class="plant-details__state">Loading plant&hellip;</p>

    <div v-else-if="error" role="alert" class="plant-details__state plant-details__state--error">
      <h1>We couldn't load this plant</h1>
      <p>{{ error }}</p>
      <button type="button" class="plant-details__retry" @click="loadPlant(route.params.id)">
        Try again
      </button>
    </div>

    <div v-else-if="!plant" class="plant-details__state">
      <h1>Plant not found</h1>
      <p>This plant may have been removed or the link is incorrect.</p>
      <RouterLink :to="{ name: 'plants' }" class="plant-details__back">
        Back to Native Plants
      </RouterLink>
    </div>

    <template v-else>
      <article class="plant-details__card">
        <div class="plant-details__media">
          <img
            v-if="plant.image && !imageFailed"
            :src="plant.image"
            :alt="plant.commonName"
            class="plant-details__image"
            @error="imageFailed = true"
          />
          <div v-else class="plant-details__media-fallback" aria-hidden="true">
            <AppIcon name="leaf" :size="64" />
          </div>
          <span class="plant-details__maintenance">{{ maintenanceLabel }} maintenance</span>
        </div>

        <div class="plant-details__body">
          <header class="plant-details__header">
            <h1 class="plant-details__title">{{ plant.commonName }}</h1>
            <p class="plant-details__scientific">{{ plant.scientificName }}</p>
          </header>

          <dl class="plant-details__meta">
            <div class="plant-details__meta-item">
              <dt>Habitat</dt>
              <dd>{{ plant.habitat }}</dd>
            </div>
            <div class="plant-details__meta-item">
              <dt>Maintenance level</dt>
              <dd>{{ maintenanceLabel }}</dd>
            </div>
          </dl>

          <h2 class="plant-details__section-title">About this plant</h2>
          <p class="plant-details__description">{{ plant.description }}</p>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.plant-details__breadcrumb {
  margin-block-end: var(--spacing-md);
}

.plant-details__breadcrumb a,
.plant-details__back {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.plant-details__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.plant-details__state h1,
.plant-details__state p {
  margin-block-end: var(--spacing-sm);
}

.plant-details__state h1 {
  font-size: var(--font-size-lg);
}

.plant-details__state p {
  color: var(--color-text-secondary);
  margin-block-end: var(--spacing-md);
}

.plant-details__state--error h1 {
  color: var(--color-error);
}

.plant-details__retry {
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.plant-details__retry:hover {
  background-color: var(--color-primary-dark);
}

.plant-details__card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.plant-details__media {
  position: relative;
  aspect-ratio: 16 / 10;
  background-color: var(--color-border);
}

@media (min-width: 768px) {
  .plant-details__media {
    aspect-ratio: 21 / 9;
  }
}

.plant-details__image,
.plant-details__media-fallback {
  width: 100%;
  height: 100%;
}

.plant-details__image {
  object-fit: cover;
}

.plant-details__media-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  color: rgba(255, 255, 255, 0.7);
}

.plant-details__maintenance {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: #8d6e00;
}

.plant-details__body {
  padding: var(--spacing-md);
}

@media (min-width: 768px) {
  .plant-details__body {
    padding: var(--spacing-xl);
  }
}

.plant-details__title {
  max-width: 25ch;
}

.plant-details__scientific {
  margin-top: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-style: italic;
}

.plant-details__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: var(--spacing-md);
  margin-block: var(--spacing-lg);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
}

.plant-details__meta dt {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-light);
}

.plant-details__meta dd {
  margin: 0;
  margin-top: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
}

.plant-details__section-title {
  margin-block: var(--spacing-lg) var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.plant-details__description {
  max-width: 70ch;
}
</style>
