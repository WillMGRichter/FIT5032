<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { getPlantById, getProjectsByPlant } from '@/services/plantService'
import { formatDate } from '@/utils/formatDate'

const route = useRoute()

const plant = ref(null)
const isLoading = ref(true)
const error = ref(null)
const imageFailed = ref(false)

const associatedProjects = ref([])
const projectsLoading = ref(false)
const projectsError = ref('')

async function loadPlant(id) {
  if (!id) return
  isLoading.value = true
  error.value = null
  plant.value = null
  imageFailed.value = false
  associatedProjects.value = []
  projectsError.value = ''
  try {
    plant.value = await getPlantById(id)
    if (plant.value) loadProjects(id)
  } catch (err) {
    error.value =
      err && err.message ? err.message : 'Something went wrong while loading this plant.'
    plant.value = null
  } finally {
    isLoading.value = false
  }
}

async function loadProjects(id) {
  projectsLoading.value = true
  projectsError.value = ''
  try {
    associatedProjects.value = (await getProjectsByPlant(id)) ?? []
  } catch {
    projectsError.value = 'Could not load associated projects.'
    associatedProjects.value = []
  } finally {
    projectsLoading.value = false
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
            :alt="`${plant.commonName} native plant`"
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

        <div class="plant-details__projects-section">
          <h2 class="plant-details__section-title">Used in projects</h2>

          <p v-if="projectsLoading" class="plant-details__projects-state">
            Loading projects&hellip;
          </p>

          <p
            v-else-if="projectsError"
            role="alert"
            class="plant-details__projects-state plant-details__projects-state--error"
          >
            {{ projectsError }}
          </p>

          <ul v-else-if="associatedProjects.length > 0" class="plant-details__project-list">
            <li
              v-for="project in associatedProjects"
              :key="project.id"
              class="plant-details__project-item"
            >
              <RouterLink
                :to="{ name: 'project-details', params: { id: project.id } }"
                class="plant-details__project-link"
              >
                <span class="plant-details__project-title">{{ project.title }}</span>
                <span class="plant-details__project-meta">
                  {{ project.location }} &middot; {{ formatDate(project.startDate) }} &ndash;
                  {{ formatDate(project.endDate) }}
                </span>
                <span class="plant-details__project-status" :data-status="project.status">
                  {{ project.status }}
                </span>
              </RouterLink>
            </li>
          </ul>

          <p v-else class="plant-details__projects-state">
            This plant is not currently used in any projects.
          </p>
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

.plant-details__projects-section {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-background);
}

@media (min-width: 768px) {
  .plant-details__projects-section {
    padding: var(--spacing-lg) var(--spacing-xl);
  }
}

.plant-details__projects-state {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.plant-details__projects-state--error {
  color: var(--color-error);
}

.plant-details__project-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.plant-details__project-link {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-xs) var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  text-decoration: none;
  color: inherit;
}

.plant-details__project-link:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.plant-details__project-title {
  font-weight: var(--font-weight-semibold);
}

.plant-details__project-link:hover .plant-details__project-title {
  color: var(--color-primary);
}

.plant-details__project-meta {
  flex-grow: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.plant-details__project-status {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
}

.plant-details__project-status[data-status='active'] {
  color: var(--color-success);
}

.plant-details__project-status[data-status='planned'] {
  color: #8d6e00;
}

.plant-details__project-status[data-status='completed'] {
  color: var(--color-text-secondary);
}

.plant-details__project-status[data-status='cancelled'] {
  color: var(--color-error);
}
</style>
