<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import ProfileForm from '@/components/forms/ProfileForm.vue'
import { formatDate } from '@/utils/formatDate'
import { getProfile, updateProfile, getMyProjects } from '@/services/authService'
import { leaveProject } from '@/services/projectService'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const profile = ref(null)
const activity = ref({ created: [], joined: [] })
const isLoading = ref(true)
const loadError = ref(null)

const isEditing = ref(false)
const isSubmitting = ref(false)
const submitError = ref(null)
const isSuccess = ref(false)

const leaveBusyId = ref(null)
const leaveError = ref('')

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  location: '',
  bio: '',
  profileImage: '',
})

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  location: '',
  bio: '',
  profileImage: '',
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function populateForm(user) {
  form.firstName = user.firstName ?? ''
  form.lastName = user.lastName ?? ''
  form.email = user.email ?? ''
  form.location = user.location ?? ''
  form.bio = user.bio ?? ''
  form.profileImage = user.profileImage ?? ''
}

async function loadPage() {
  isLoading.value = true
  loadError.value = null
  try {
    const [userData, projectData] = await Promise.all([getProfile(), getMyProjects()])
    profile.value = userData
    activity.value = projectData
    populateForm(userData)
  } catch (err) {
    loadError.value =
      err && err.message ? err.message : 'Something went wrong while loading your profile.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPage)

const initials = computed(() => {
  const first = profile.value?.firstName?.charAt(0) ?? ''
  const last = profile.value?.lastName?.charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || '?'
})

function validateField(field) {
  switch (field) {
    case 'firstName':
      errors.firstName = !form.firstName.trim()
        ? 'First name is required.'
        : form.firstName.trim().length > 60
          ? 'First name must be 60 characters or fewer.'
          : ''
      break
    case 'lastName':
      errors.lastName = !form.lastName.trim()
        ? 'Last name is required.'
        : form.lastName.trim().length > 60
          ? 'Last name must be 60 characters or fewer.'
          : ''
      break
    case 'email':
      errors.email = !form.email.trim()
        ? 'Email is required.'
        : !EMAIL_PATTERN.test(form.email.trim())
          ? 'Please enter a valid email address.'
          : ''
      break
    case 'location':
      errors.location =
        form.location.trim().length > 160 ? 'Location must be 160 characters or fewer.' : ''
      break
    case 'bio':
      errors.bio = form.bio.trim().length > 500 ? 'Bio must be 500 characters or fewer.' : ''
      break
    case 'profileImage':
      if (form.profileImage.trim() && !/^https?:\/\//i.test(form.profileImage.trim())) {
        errors.profileImage = 'Profile image must be a URL starting with http:// or https://'
      } else {
        errors.profileImage = ''
      }
      break
  }
}

function onFieldUpdate({ field, value }) {
  form[field] = value
  validateField(field)
  submitError.value = null
  isSuccess.value = false
}

function startEditing() {
  isSuccess.value = false
  isEditing.value = true
}

function cancelEditing() {
  if (isSubmitting.value) return
  populateForm(profile.value)
  Object.keys(errors).forEach((key) => (errors[key] = ''))
  submitError.value = null
  isEditing.value = false
}

async function handleSubmit() {
  if (isSubmitting.value) return

  submitError.value = null
  Object.keys(errors).forEach(validateField)
  if (Object.values(errors).some(Boolean)) {
    submitError.value = 'Please fix the highlighted fields and try again.'
    return
  }

  isSubmitting.value = true
  try {
    const updated = await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      location: form.location.trim(),
      bio: form.bio.trim(),
      profileImage: form.profileImage.trim(),
    })

    profile.value = updated
    authStore.updateUser(updated)

    isEditing.value = false
    isSuccess.value = true
    setTimeout(() => {
      isSuccess.value = false
    }, 3000)
  } catch (err) {
    if (err instanceof ApiError && err.status === 400 && err.details) {
      for (const [field, message] of Object.entries(err.details)) {
        if (field in errors) errors[field] = message
      }
      submitError.value = 'Please review the highlighted fields.'
    } else {
      submitError.value =
        err && err.message ? err.message : 'Something went wrong while saving your profile.'
    }
  } finally {
    isSubmitting.value = false
  }
}

const todayIso = new Date().toISOString().slice(0, 10)

const groupedJoined = computed(() => {
  const upcoming = []
  const active = []
  const completed = []
  const cancelled = []

  for (const project of activity.value.joined) {
    const s = project.status
    if (s === 'cancelled') {
      cancelled.push(project)
    } else if (s === 'completed') {
      completed.push(project)
    } else if (s === 'active') {
      active.push(project)
    } else {
      upcoming.push(project)
    }
  }

  return { upcoming, active, completed, cancelled }
})

const nextProject = computed(() => {
  const all = [...groupedJoined.value.upcoming, ...groupedJoined.value.active]
  return all.find((p) => (p.endDate ?? '') >= todayIso) ?? null
})

const hasJoinedProjects = computed(() => activity.value.joined.length > 0)

function canLeave(project) {
  return ['planned', 'active'].includes(project.status)
}

async function handleLeave(project) {
  if (leaveBusyId.value) return
  const confirmed = window.confirm(
    `Leave "${project.title}"? You can rejoin later if spots are available.`,
  )
  if (!confirmed) return

  leaveBusyId.value = project.id
  leaveError.value = ''
  try {
    const result = await leaveProject(project.id)
    activity.value.joined = activity.value.joined.filter((p) => p.id !== project.id)
    const source = activity.value.created.find((p) => p.id === project.id)
    if (source) source.volunteerCount = result.volunteerCount
  } catch (err) {
    leaveError.value =
      err instanceof ApiError && err.status === 401
        ? 'Your session expired. Please log in again.'
        : err && err.message
          ? err.message
          : 'Could not leave this project.'
  } finally {
    leaveBusyId.value = null
  }
}
</script>

<template>
  <section class="profile" aria-labelledby="profile-heading">
    <header class="profile__header">
      <h1 id="profile-heading">My Profile</h1>
      <p class="profile__intro">Your account details and GreenLink activity.</p>
    </header>

    <p v-if="isLoading" class="profile__state">Loading your profile&hellip;</p>

    <div v-else-if="loadError" role="alert" class="profile__state profile__state--error">
      <h2>We couldn't load your profile</h2>
      <p>{{ loadError }}</p>
      <button type="button" class="profile__retry" @click="loadPage">Try again</button>
    </div>

    <template v-else>
      <div v-if="isSuccess" role="status" class="profile__success">Changes saved.</div>

      <article v-if="!isEditing" class="profile-card">
        <div class="profile-card__identity">
          <img
            v-if="profile.profileImage"
            :src="profile.profileImage"
            :alt="`Profile photo of ${profile.fullName}`"
            class="profile-card__avatar"
          />
          <span
            v-else
            class="profile-card__avatar profile-card__avatar--fallback"
            aria-hidden="true"
          >
            {{ initials }}
          </span>
          <div class="profile-card__heading">
            <h2>{{ profile.fullName }}</h2>
            <p class="profile-card__email">{{ profile.email }}</p>
          </div>
          <div class="profile-card__actions">
            <button type="button" class="profile__edit-btn" @click="startEditing">
              Edit profile
            </button>
          </div>
        </div>

        <dl class="profile-card__details">
          <div v-if="profile.location" class="profile-card__detail">
            <dt>Location</dt>
            <dd>{{ profile.location }}</dd>
          </div>
          <div v-if="profile.bio" class="profile-card__detail profile-card__detail--wide">
            <dt>Bio</dt>
            <dd>{{ profile.bio }}</dd>
          </div>
          <div class="profile-card__detail">
            <dt>Member since</dt>
            <dd>{{ formatDate(profile.createdAt) || 'Unknown' }}</dd>
          </div>
        </dl>
      </article>

      <form v-else class="profile-edit" novalidate @submit.prevent="handleSubmit">
        <ProfileForm
          :profile="form"
          :errors="errors"
          :disabled="isSubmitting"
          @update="onFieldUpdate"
        />

        <div v-if="submitError" role="alert" class="profile__alert">{{ submitError }}</div>

        <div class="profile-edit__actions">
          <button type="submit" class="profile__save-btn" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving\u2026' : 'Save changes' }}
          </button>
          <button type="button" class="profile__cancel-btn" @click="cancelEditing">Cancel</button>
        </div>
      </form>

      <section class="activity" aria-labelledby="activity-created-title">
        <h2 id="activity-created-title">Projects you've created</h2>
        <ul v-if="activity.created.length > 0" class="activity__list">
          <li v-for="project in activity.created" :key="project.id" class="activity__item">
            <RouterLink
              :to="{ name: 'project-details', params: { id: project.id } }"
              class="activity__link"
            >
              <span class="activity__title">
                {{ project.title }}
                <span class="activity__status-badge" :data-status="project.status">
                  {{ project.status }}
                </span>
              </span>
              <span class="activity__meta">
                {{ formatDate(project.startDate) }} &ndash; {{ formatDate(project.endDate) }}
                <template v-if="project.location"> &middot; {{ project.location }} </template>
              </span>
            </RouterLink>
            <RouterLink
              :to="{ name: 'edit-project', params: { id: project.id } }"
              class="activity__action"
            >
              Edit
            </RouterLink>
          </li>
        </ul>
        <p v-else class="activity__empty">
          You haven't created any projects yet.
          <RouterLink :to="{ name: 'create-project' }">Create one</RouterLink>
        </p>
      </section>

      <section class="activity" aria-labelledby="activity-joined-title">
        <h2 id="activity-joined-title">My Projects</h2>

        <div v-if="nextProject" class="next-project">
          <p class="next-project__label">Next Project</p>
          <RouterLink
            :to="{ name: 'project-details', params: { id: nextProject.id } }"
            class="next-project__link"
          >
            <span class="next-project__title">{{ nextProject.title }}</span>
            <span class="next-project__date">
              {{ formatDate(nextProject.startDate) }} &ndash; {{ formatDate(nextProject.endDate) }}
            </span>
            <span class="next-project__location">{{ nextProject.location }}</span>
          </RouterLink>
        </div>

        <p v-if="leaveError" role="alert" class="profile__alert">{{ leaveError }}</p>

        <template v-if="hasJoinedProjects">
          <div
            v-for="(label, key) in {
              upcoming: 'Upcoming',
              active: 'Active',
              completed: 'Completed',
              cancelled: 'Cancelled',
            }"
            :key="key"
            class="activity__group"
          >
            <h3 v-if="groupedJoined[key].length > 0" class="activity__group-title">{{ label }}</h3>
            <ul v-if="groupedJoined[key].length > 0" class="activity__list">
              <li v-for="project in groupedJoined[key]" :key="project.id" class="activity__item">
                <RouterLink
                  :to="{ name: 'project-details', params: { id: project.id } }"
                  class="activity__link"
                >
                  <span class="activity__title">
                    {{ project.title }}
                    <span class="activity__status-badge" :data-status="project.status">
                      {{ project.status }}
                    </span>
                  </span>
                  <span class="activity__meta">
                    {{ formatDate(project.startDate) }} &ndash; {{ formatDate(project.endDate) }}
                    <template v-if="project.location"> &middot; {{ project.location }} </template>
                    &middot; {{ project.participation.role }}
                  </span>
                </RouterLink>
                <button
                  v-if="canLeave(project)"
                  type="button"
                  class="activity__leave"
                  :disabled="leaveBusyId === project.id"
                  @click="handleLeave(project)"
                >
                  {{ leaveBusyId === project.id ? 'Leaving\u2026' : 'Leave' }}
                </button>
              </li>
            </ul>
          </div>
        </template>

        <p v-else class="activity__empty">
          You haven't joined any projects yet.
          <RouterLink :to="{ name: 'discover' }">Browse Discover</RouterLink>
        </p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.profile__header {
  margin-block-end: var(--spacing-xl);
}

.profile__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.profile__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.profile__state h2 {
  font-size: var(--font-size-lg);
  margin-block-end: var(--spacing-sm);
}

.profile__state p {
  color: var(--color-text-secondary);
  margin-block-end: var(--spacing-md);
}

.profile__state--error {
  border-color: var(--color-error);
}

.profile__retry,
.profile__save-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.profile__retry:hover,
.profile__save-btn:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.profile__save-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.profile__success {
  margin-block-end: var(--spacing-lg);
  padding: var(--spacing-md);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.profile__alert {
  padding: var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
}

.profile-card,
.profile-edit {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

@media (min-width: 768px) {
  .profile-card,
  .profile-edit {
    padding: var(--spacing-xl);
  }
}

.profile-card__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-lg);
}

.profile-card__avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-card__avatar--fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light));
  color: var(--color-surface);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.profile-card__heading {
  min-width: 0;
}

.profile-card__email {
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.profile-card__actions {
  margin-inline-start: auto;
}

.profile__edit-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.profile__edit-btn:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.profile-card__details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: var(--spacing-md);
  margin: 0;
  margin-block-start: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.profile-card__detail--wide {
  grid-column: 1 / -1;
}

.profile-card__details dt {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-light);
}

.profile-card__details dd {
  margin: 0;
  margin-top: var(--spacing-xs);
}

.profile-edit {
  max-width: 720px;
}

.profile-edit__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-md) var(--spacing-lg);
}

.profile__cancel-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.profile__cancel-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text-light);
}

.activity {
  margin-block-start: var(--spacing-2xl);
}

.activity h2 {
  font-size: var(--font-size-xl);
  margin-block-end: var(--spacing-md);
}

.activity__group {
  margin-block-end: var(--spacing-lg);
}

.activity__group-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-light);
  margin-block-end: var(--spacing-sm);
}

.activity__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.activity__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm) var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.activity__link {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.activity__title {
  font-weight: var(--font-weight-medium);
}

.activity__link:hover .activity__title {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.activity__meta {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.activity__status-badge {
  display: inline-block;
  margin-left: var(--spacing-sm);
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
  vertical-align: middle;
}

.activity__status-badge[data-status='planned'] {
  color: #8d6e00;
}

.activity__status-badge[data-status='active'] {
  color: var(--color-success);
}

.activity__status-badge[data-status='completed'] {
  color: var(--color-text-secondary);
}

.activity__status-badge[data-status='cancelled'] {
  color: var(--color-error);
}

.activity__action {
  flex-shrink: 0;
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.activity__action:hover {
  border-color: var(--color-primary);
}

.activity__leave {
  flex-shrink: 0;
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-error);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.activity__leave:hover:not(:disabled) {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.activity__leave:disabled {
  opacity: 0.6;
  cursor: wait;
}

.activity__empty {
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
}

.activity__empty a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.next-project {
  margin-block-end: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.next-project__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary);
  margin-block-end: var(--spacing-xs);
}

.next-project__link {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  text-decoration: none;
  color: inherit;
}

.next-project__link:hover .next-project__title {
  color: var(--color-primary);
  text-decoration: underline;
}

.next-project__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.next-project__date,
.next-project__location {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
