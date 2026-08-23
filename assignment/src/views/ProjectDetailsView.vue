<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getProjectById } from '@/services/projectService'
import { formatDate } from '@/utils/formatDate'

const route = useRoute()

const project = ref(null)
const isLoading = ref(true)
const error = ref(null)

async function loadProject(id) {
  if (!id) return
  isLoading.value = true
  error.value = null
  project.value = null
  try {
    project.value = await getProjectById(id)
  } catch (err) {
    error.value =
      err && err.message ? err.message : 'Something went wrong while loading this project.'
    project.value = null
  } finally {
    isLoading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => loadProject(id),
  { immediate: true },
)

const statusLabel = computed(() =>
  project.value?.status
    ? project.value.status.charAt(0).toUpperCase() + project.value.status.slice(1)
    : '',
)

const dateRange = computed(() => {
  if (!project.value) return ''
  const start = formatDate(project.value.startDate)
  const end = formatDate(project.value.endDate)
  return start && end ? `${start} \u2013 ${end}` : start || end
})

const spotsRemaining = computed(() =>
  project.value
    ? Math.max((project.value.capacity ?? 0) - (project.value.volunteerCount ?? 0), 0)
    : 0,
)
</script>

<template>
  <section class="details">
    <p v-if="isLoading" class="details__state">Loading project&hellip;</p>

    <div v-else-if="error" role="alert" class="details__state details__state--error">
      <h1>We couldn't load this project</h1>
      <p>{{ error }}</p>
      <div class="details__actions">
        <button type="button" class="details__retry" @click="loadProject(route.params.id)">
          Try again
        </button>
        <RouterLink :to="{ name: 'discover' }" class="details__back">Back to Discover</RouterLink>
      </div>
    </div>

    <div v-else-if="!project" class="details__state">
      <h1>Project not found</h1>
      <p>This project may have been removed or the link is incorrect.</p>
      <div class="details__actions">
        <RouterLink :to="{ name: 'discover' }" class="details__back">Back to Discover</RouterLink>
      </div>
    </div>

    <template v-else>
      <nav class="details__breadcrumb">
        <RouterLink :to="{ name: 'discover' }">&larr; Back to Discover</RouterLink>
      </nav>

      <article class="details__card">
        <div class="details__media">
          <img
            v-if="project.image"
            :src="project.image"
            :alt="`Habitat at ${project.location}`"
            class="details__image"
          />
          <div v-else class="details__media-fallback" aria-hidden="true"></div>
          <span class="details__status" :data-status="project.status">{{ statusLabel }}</span>
        </div>

        <div class="details__body">
          <header class="details__header">
            <p class="details__category">{{ project.category?.name }}</p>
            <h1 class="details__title">{{ project.title }}</h1>
            <p class="details__location">{{ project.location }}</p>
            <RouterLink
              :to="{ name: 'edit-project', params: { id: project.id } }"
              class="details__edit"
            >
              Edit project
            </RouterLink>
          </header>

          <dl class="details__meta">
            <div class="details__meta-item">
              <dt>When</dt>
              <dd>{{ dateRange }}</dd>
            </div>
            <div class="details__meta-item">
              <dt>Status</dt>
              <dd>{{ statusLabel }}</dd>
            </div>
            <div class="details__meta-item">
              <dt>Volunteer spots</dt>
              <dd>{{ spotsRemaining }} of {{ project.capacity }} left</dd>
            </div>
            <div class="details__meta-item" v-if="project.creator">
              <dt>Organiser</dt>
              <dd>{{ project.creator.fullName }}</dd>
            </div>
          </dl>

          <h2 class="details__section-title">About this project</h2>
          <p class="details__description">{{ project.description }}</p>

          <template v-if="project.plants && project.plants.length > 0">
            <h2 class="details__section-title">Plant species</h2>
            <ul class="details__plants">
              <li v-for="plant in project.plants" :key="plant.id" class="details__plant">
                <span class="details__plant-name">{{ plant.commonName }}</span>
                <span class="details__plant-scientific">({{ plant.scientificName }})</span>
                <span class="details__plant-quantity">&times;{{ plant.quantity }}</span>
              </li>
            </ul>
          </template>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.details__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.details__state h1,
.details__state p {
  margin-block-end: var(--spacing-sm);
}

.details__state--error h1 {
  color: var(--color-error);
}

.details__state p {
  color: var(--color-text-secondary);
}

.details__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.details__retry {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.details__retry:hover {
  background-color: var(--color-primary-dark);
}

.details__back {
  align-self: center;
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.details__breadcrumb {
  margin-block-end: var(--spacing-md);
}

.details__breadcrumb a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.details__card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.details__media {
  position: relative;
  aspect-ratio: 16 / 10;
  background-color: var(--color-border);
}

.details__media img,
.details__media-fallback {
  width: 100%;
  height: 100%;
}

.details__media img {
  object-fit: cover;
}

.details__media-fallback {
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
}

.details__status {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.details__status[data-status='active'] {
  color: var(--color-success);
}

.details__status[data-status='planned'] {
  color: #8d6e00;
}

.details__status[data-status='completed'] {
  color: var(--color-text-secondary);
}

.details__status[data-status='cancelled'] {
  color: var(--color-error);
}

.details__body {
  padding: var(--spacing-md);
}

@media (min-width: 768px) {
  .details__body {
    padding: var(--spacing-xl);
  }
}

.details__category {
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.details__edit {
  display: inline-block;
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.details__title {
  margin-top: var(--spacing-xs);
}

.details__location {
  margin-top: var(--spacing-xs);
  color: var(--color-text-secondary);
}

.details__edit:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.details__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacing-md);
  margin-block: var(--spacing-lg);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
}

.details__meta dt {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-light);
}

.details__meta dd {
  margin: 0;
  margin-top: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
}

.details__section-title {
  margin-block: var(--spacing-lg) var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.details__description {
  max-width: 70ch;
}

.details__plants {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.details__plant {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  font-size: var(--font-size-sm);
}

.details__plant-name {
  font-weight: var(--font-weight-medium);
}

.details__plant-scientific {
  color: var(--color-text-secondary);
  font-style: italic;
}

.details__plant-quantity {
  color: var(--color-primary);
}
</style>
