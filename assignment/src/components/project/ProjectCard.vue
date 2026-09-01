<script setup>
import { computed, ref } from 'vue'
import { formatDate } from '@/utils/formatDate'

const emit = defineEmits(['select'])

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
})

const imageFailed = ref(false)

const dateRange = computed(() => {
  const start = formatDate(props.project.startDate)
  const end = formatDate(props.project.endDate)
  if (!start || !end) return ''
  return `${start} \u2013 ${end}`
})

const statusLabel = computed(() =>
  props.project.status
    ? props.project.status.charAt(0).toUpperCase() + props.project.status.slice(1)
    : '',
)

const spotsRemaining = computed(() =>
  Math.max((props.project.capacity ?? 0) - (props.project.volunteerCount ?? 0), 0),
)

const isOpenForParticipation = computed(() => ['planned', 'active'].includes(props.project.status))

const statusHint = computed(() => {
  const s = props.project.status
  if (s === 'completed') return 'Completed'
  if (s === 'cancelled') return 'Cancelled'
  if (!isOpenForParticipation.value) return null
  if (spotsRemaining.value === 0) return 'Full'
  return null
})

const ratingDisplay = computed(() => {
  const avg = props.project.avgRating ?? 0
  const count = props.project.ratingCount ?? 0
  if (count === 0) return null
  return { avg, count }
})

function onImageError() {
  imageFailed.value = true
}

function onSelect() {
  emit('select', props.project.id)
}
</script>

<template>
  <article class="project-card" :class="{ 'project-card--selected': isSelected }" @click="onSelect">
    <div class="project-card__media">
      <img
        v-if="project.image && !imageFailed"
        :src="project.image"
        :alt="`Habitat at ${project.location}`"
        class="project-card__image"
        loading="lazy"
        @error="onImageError"
      />
      <div v-else class="project-card__media-fallback" aria-hidden="true">
        <span>{{ project.title }}</span>
      </div>
      <span class="project-card__status" :data-status="project.status">{{ statusLabel }}</span>
    </div>

    <div class="project-card__body">
      <p class="project-card__category">{{ project.category?.name }}</p>
      <h2 class="project-card__title">
        <RouterLink :to="{ name: 'project-details', params: { id: project.id } }">
          {{ project.title }}
        </RouterLink>
      </h2>
      <p class="project-card__location">{{ project.location }}</p>
      <p class="project-card__description">{{ project.description }}</p>
      <p v-if="ratingDisplay" class="project-card__rating">
        <span
          class="project-card__rating-stars"
          :aria-label="`${ratingDisplay.avg} out of 5 stars`"
        >
          <span
            v-for="i in 5"
            :key="i"
            :class="
              i <= Math.round(ratingDisplay.avg)
                ? 'project-card__star--filled'
                : 'project-card__star'
            "
            >&#9733;</span
          >
        </span>
        <span class="project-card__rating-text"
          >{{ ratingDisplay.avg }} ({{ ratingDisplay.count }})</span
        >
      </p>
    </div>

    <footer class="project-card__footer">
      <div class="project-card__meta">
        <p class="project-card__dates">{{ dateRange }}</p>
        <p class="project-card__participants">
          {{ project.volunteerCount ?? 0 }} / {{ project.capacity }} participants
        </p>
        <p v-if="statusHint" class="project-card__hint project-card__hint--status">
          {{ statusHint }}
        </p>
      </div>
      <RouterLink
        :to="{ name: 'project-details', params: { id: project.id } }"
        class="project-card__action"
      >
        View Project
      </RouterLink>
    </footer>
  </article>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.project-card:hover {
  box-shadow: var(--shadow-md);
}

.project-card--selected {
  box-shadow:
    0 0 0 2px var(--color-primary),
    var(--shadow-md);
}

.project-card__media {
  position: relative;
  aspect-ratio: 16 / 9;
  background-color: var(--color-border);
}

.project-card__image,
.project-card__media-fallback {
  width: 100%;
  height: 100%;
}

.project-card__image {
  object-fit: cover;
}

.project-card__media-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.project-card__status {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.project-card__status[data-status='active'] {
  color: var(--color-success);
}

.project-card__status[data-status='planned'] {
  color: #8d6e00;
}

.project-card__status[data-status='completed'] {
  color: var(--color-text-secondary);
}

.project-card__status[data-status='cancelled'] {
  color: var(--color-error);
}

.project-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  flex-grow: 1;
}

.project-card__category {
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.project-card__title a {
  color: inherit;
}

.project-card__title a:hover {
  color: var(--color-primary);
}

.project-card__location {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.project-card__description {
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-card__rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.project-card__rating-stars {
  color: var(--color-border);
}

.project-card__star--filled {
  color: #f59e0b;
}

.project-card__rating-text {
  color: var(--color-text-secondary);
}

.project-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm) var(--spacing-md);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.project-card__meta {
  min-width: 0;
  font-size: var(--font-size-sm);
}

.project-card__dates {
  font-weight: var(--font-weight-medium);
}

.project-card__spots {
  color: var(--color-text-secondary);
}

.project-card__participants {
  font-weight: var(--font-weight-medium);
}

.project-card__hint--status {
  color: var(--color-text-secondary);
  font-style: italic;
}

.project-card__action {
  flex-shrink: 0;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.project-card__action:hover {
  background-color: var(--color-primary-dark);
}
</style>
