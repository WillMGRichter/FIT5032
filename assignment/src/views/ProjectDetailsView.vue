<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getProjectById,
  getParticipation,
  joinProject,
  leaveProject,
  getProjectPlants,
  deleteProject,
} from '@/services/projectService'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/composables/usePermissions'
import ProjectPlantList from '@/components/plant/ProjectPlantList.vue'
import ProjectRating from '@/components/project/ProjectRating.vue'
import EmailComposeModal from '@/components/email/EmailComposeModal.vue'
import { getProjectParticipants } from '@/services/emailService'
import { formatDate } from '@/utils/formatDate'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { canManageProject } = usePermissions()

const project = ref(null)
const isLoading = ref(true)
const error = ref(null)

const projectPlants = ref([])
const plantsLoading = ref(false)
const plantsError = ref('')

const isParticipating = ref(false)
const isActionBusy = ref(false)
const actionError = ref(null)

const isDeleting = ref(false)
const deleteError = ref(null)

const showEmailModal = ref(false)
const participants = ref([])
const participantsLoading = ref(false)

const canManage = computed(() => canManageProject(project.value))

async function loadProject(id) {
  if (!id) return
  isLoading.value = true
  error.value = null
  project.value = null
  isParticipating.value = false
  actionError.value = null
  projectPlants.value = []
  plantsLoading.value = true
  plantsError.value = ''
  try {
    project.value = await getProjectById(id)
    await loadParticipation()
    await loadPlants()
    await loadParticipants()
  } catch (err) {
    error.value =
      err && err.message ? err.message : 'Something went wrong while loading this project.'
    project.value = null
  } finally {
    isLoading.value = false
  }
}

async function loadPlants() {
  if (!project.value) return
  plantsLoading.value = true
  plantsError.value = ''
  try {
    projectPlants.value = (await getProjectPlants(project.value.id)) ?? []
  } catch {
    plantsError.value = 'Could not load the native plants for this project.'
    projectPlants.value = []
  } finally {
    plantsLoading.value = false
  }
}

async function handleDelete() {
  if (isDeleting.value || !project.value) return
  const confirmed = window.confirm(`Delete "${project.value.title}"? This cannot be undone.`)
  if (!confirmed) return

  isDeleting.value = true
  deleteError.value = null
  try {
    await deleteProject(project.value.id)
    router.push({ name: 'discover' })
  } catch (err) {
    deleteError.value =
      err instanceof ApiError && err.message ? err.message : 'Could not delete this project.'
  } finally {
    isDeleting.value = false
  }
}

async function loadParticipation() {
  isParticipating.value = false
  if (!authStore.isAuthenticated.value || !project.value) return
  try {
    const status = await getParticipation(project.value.id)
    isParticipating.value = Boolean(status?.participating)
  } catch {
    isParticipating.value = false
  }
}

async function loadParticipants() {
  if (!project.value || !canManage.value) return
  participantsLoading.value = true
  try {
    participants.value = (await getProjectParticipants(project.value.id)) ?? []
  } catch {
    participants.value = []
  } finally {
    participantsLoading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => loadProject(id),
  { immediate: true },
)

const isOpenForParticipation = computed(() => ['planned', 'active'].includes(project.value?.status))

const isCompleted = computed(() => project.value?.status === 'completed')

const isCancelled = computed(() => project.value?.status === 'cancelled')

const hasSpotsRemaining = computed(() => spotsRemaining.value > 0)

const emailRecipientLabel = computed(() =>
  project.value?.title ? `Participants of "${project.value.title}"` : 'Project participants',
)

async function handleJoin() {
  if (isActionBusy.value || !project.value) return

  actionError.value = null
  isActionBusy.value = true
  try {
    const result = await joinProject(project.value.id)
    project.value.volunteerCount = result.volunteerCount
    isParticipating.value = true
  } catch (err) {
    actionError.value =
      err instanceof ApiError && err.status === 401
        ? 'Your session expired. Please log in again.'
        : err && err.message
          ? err.message
          : 'Something went wrong while joining this project.'
    if (err instanceof ApiError && [404, 409].includes(err.status)) {
      await loadProject(route.params.id)
    }
  } finally {
    isActionBusy.value = false
  }
}

async function handleLeave() {
  if (isActionBusy.value || !project.value) return

  actionError.value = null
  isActionBusy.value = true
  try {
    const result = await leaveProject(project.value.id)
    project.value.volunteerCount = result.volunteerCount
    isParticipating.value = false
  } catch (err) {
    actionError.value =
      err && err.message ? err.message : 'Something went wrong while leaving this project.'
    if (err instanceof ApiError && [401, 404].includes(err.status)) {
      await loadProject(route.params.id)
    }
  } finally {
    isActionBusy.value = false
  }
}

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
            <div v-if="canManage" class="details__manage">
              <RouterLink
                :to="{ name: 'edit-project', params: { id: project.id } }"
                class="details__edit"
              >
                Edit project
              </RouterLink>
              <button
                type="button"
                class="details__email-btn"
                :disabled="participantsLoading || participants.length === 0"
                @click="showEmailModal = true"
              >
                Email Participants
              </button>
              <button
                type="button"
                class="details__delete"
                :disabled="isDeleting"
                @click="handleDelete"
              >
                {{ isDeleting ? 'Deleting…' : 'Delete project' }}
              </button>
              <p v-if="deleteError" role="alert" class="details__manage-error">
                {{ deleteError }}
              </p>
            </div>
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
              <dt>Volunteers</dt>
              <dd>
                {{ project.volunteerCount ?? 0 }} / {{ project.capacity }} participants
                <span
                  v-if="isOpenForParticipation && hasSpotsRemaining"
                  class="details__spots-remaining"
                >
                  &middot; {{ spotsRemaining }} place{{ spotsRemaining === 1 ? '' : 's' }} remaining
                </span>
              </dd>
            </div>
            <div class="details__meta-item" v-if="project.creator">
              <dt>Organiser</dt>
              <dd>{{ project.creator.fullName }}</dd>
            </div>
          </dl>

          <div class="details__participation">
            <RouterLink
              v-if="!authStore.isAuthenticated.value"
              :to="{ name: 'login', query: { redirect: route.fullPath } }"
              class="details__join"
            >
              Log in to join
            </RouterLink>

            <template v-else-if="isCancelled">
              <span class="details__state-pill details__state-pill--cancelled"
                >Project Cancelled</span
              >
            </template>

            <template v-else-if="isCompleted">
              <span class="details__state-pill details__state-pill--completed"
                >Project Completed</span
              >
            </template>

            <template v-else-if="isOpenForParticipation">
              <template v-if="isParticipating">
                <span class="details__joined-note">You're signed up as a volunteer.</span>
                <button
                  type="button"
                  class="details__leave"
                  :disabled="isActionBusy"
                  @click="handleLeave"
                >
                  {{ isActionBusy ? 'Leaving…' : 'Leave project' }}
                </button>
              </template>
              <button
                v-else-if="hasSpotsRemaining"
                type="button"
                class="details__join"
                :disabled="isActionBusy"
                @click="handleJoin"
              >
                {{ isActionBusy ? 'Joining…' : 'Join Project' }}
              </button>
              <span v-else class="details__state-pill details__state-pill--full">Project Full</span>
            </template>
          </div>

          <p v-if="actionError" role="alert" class="details__action-error">{{ actionError }}</p>

          <h2 class="details__section-title">About this project</h2>
          <p class="details__description">{{ project.description }}</p>
        </div>

        <div class="details__plants-section">
          <ProjectPlantList
            :plants="projectPlants"
            :is-loading="plantsLoading"
            :error="plantsError"
          />
        </div>

        <ProjectRating :project-id="project.id" />
      </article>
    </template>

    <EmailComposeModal
      :visible="showEmailModal"
      :recipients="participants"
      :recipient-label="emailRecipientLabel"
      :project-title="project?.title || ''"
      @close="showEmailModal = false"
    />
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

.details__manage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm) var(--spacing-md);
  margin-top: var(--spacing-md);
}

.details__manage .details__edit {
  margin-top: 0;
}

.details__delete {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-error);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.details__delete:hover:not(:disabled) {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.details__email-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.details__email-btn:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.details__email-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.details__delete:disabled {
  opacity: 0.6;
  cursor: wait;
}

.details__manage-error {
  flex-basis: 100%;
  margin: 0;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  color: var(--color-error);
  font-size: var(--font-size-sm);
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

.details__participation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-lg);
}

.details__join {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-xl);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.details__join:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.details__leave {
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-error);
  font-weight: var(--font-weight-semibold);
}

.details__leave:hover:not(:disabled) {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.details__joined-note {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.details__state-pill,
.details__state-pill--full,
.details__join:disabled,
.details__leave:disabled {
  opacity: 0.7;
}

.details__state-pill--full {
  border-color: var(--color-error);
  color: var(--color-error);
}

.details__state-pill--completed {
  color: var(--color-text-secondary);
}

.details__state-pill--cancelled {
  color: var(--color-error);
}

.details__spots-remaining {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.details__state-pill,
.details__state-pill--full {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
}

.details__action-error {
  margin-block-end: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
}

.details__section-title {
  margin-block: var(--spacing-lg) var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.details__description {
  max-width: 70ch;
}

.details__plants-section {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-background);
}

@media (min-width: 768px) {
  .details__plants-section {
    padding: var(--spacing-lg) var(--spacing-xl);
  }
}
</style>
