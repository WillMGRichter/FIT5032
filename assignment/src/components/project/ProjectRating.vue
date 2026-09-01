<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import {
  getProjectRatings,
  submitRating,
  updateRating,
  deleteRating,
} from '@/services/ratingService'
import { ApiError } from '@/services/api'
import FormError from '@/components/forms/FormError.vue'

const props = defineProps({
  projectId: { type: [Number, String], required: true },
})

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated.value)
const currentUserId = computed(() => authStore.state.user?.id)

const ratings = ref([])
const aggregate = ref({
  ratingCount: 0,
  averageScore: 0,
  breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
})
const isLoading = ref(true)
const error = ref(null)

const formScore = ref(5)
const formComment = ref('')
const formErrors = ref({ score: '', comment: '' })
const isSubmitting = ref(false)
const submitError = ref(null)
const submitSuccess = ref('')
const hoverScore = ref(0)

const myRating = computed(() => ratings.value.find((r) => r.userId === currentUserId.value) ?? null)

const isEditing = computed(() => myRating.value !== null)

const maxBreakdown = computed(() => {
  const vals = Object.values(aggregate.value.breakdown)
  return Math.max(...vals, 1)
})

async function loadRatings() {
  if (!props.projectId) return
  isLoading.value = true
  error.value = null
  try {
    const data = await getProjectRatings(props.projectId)
    ratings.value = data.ratings ?? []
    aggregate.value = data.aggregate ?? aggregate.value
    if (myRating.value) {
      formScore.value = myRating.value.score
      formComment.value = myRating.value.comment ?? ''
    }
  } catch (err) {
    error.value = err && err.message ? err.message : 'Could not load ratings.'
  } finally {
    isLoading.value = false
  }
}

function validateForm() {
  const errors = {}
  const n = Number(formScore.value)
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    errors.score = 'Score must be between 1 and 5.'
  }
  const comment = String(formComment.value ?? '').trim()
  if (comment.length > 500) {
    errors.comment = 'Comment must be 500 characters or fewer.'
  }
  formErrors.value = { score: errors.score ?? '', comment: errors.comment ?? '' }
  return Object.keys(errors).length === 0
}

function resetForm() {
  formScore.value = 5
  formComment.value = ''
  formErrors.value = { score: '', comment: '' }
  submitError.value = null
  submitSuccess.value = ''
}

async function handleSubmit() {
  if (isSubmitting.value) return
  submitError.value = null
  submitSuccess.value = ''
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    const payload = {
      score: Number(formScore.value),
      comment: String(formComment.value ?? '').trim() || null,
    }
    let result
    if (isEditing.value) {
      result = await updateRating(props.projectId, myRating.value.id, payload)
      submitSuccess.value = 'Rating updated.'
    } else {
      result = await submitRating(props.projectId, payload)
      submitSuccess.value = 'Rating submitted!'
    }
    if (result.aggregate) aggregate.value = result.aggregate
    await loadRatings()
  } catch (err) {
    if (err instanceof ApiError && err.status === 400 && err.details?.errors) {
      const e = err.details.errors
      formErrors.value = { score: e.score ?? '', comment: e.comment ?? '' }
      submitError.value = 'Please fix the highlighted fields.'
    } else {
      submitError.value = err && err.message ? err.message : 'Could not save your rating.'
    }
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete() {
  if (isSubmitting.value || !myRating.value) return
  const confirmed = window.confirm('Remove your rating?')
  if (!confirmed) return

  isSubmitting.value = true
  submitError.value = null
  submitSuccess.value = ''
  try {
    const result = await deleteRating(props.projectId, myRating.value.id)
    if (result.aggregate) aggregate.value = result.aggregate
    resetForm()
    submitSuccess.value = 'Rating removed.'
    await loadRatings()
  } catch (err) {
    submitError.value = err && err.message ? err.message : 'Could not delete your rating.'
  } finally {
    isSubmitting.value = false
  }
}

function setScore(score) {
  formScore.value = score
  formErrors.value.score = ''
}

function handleStarKeydown(event, star) {
  const starCount = 5
  let next
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = star < starCount ? star + 1 : 1
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      next = star > 1 ? star - 1 : starCount
      break
    case 'Home':
      next = 1
      break
    case 'End':
      next = starCount
      break
    default:
      return
  }
  event.preventDefault()
  setScore(next)
  focusStar(next)
}

function focusStar(star) {
  const el = document.querySelector(`.project-rating__star-btn[data-star="${star}"]`)
  el?.focus()
}

watch(
  () => props.projectId,
  () => loadRatings(),
  { immediate: true },
)
</script>

<template>
  <section class="project-rating" aria-labelledby="rating-heading">
    <h2 id="rating-heading" class="project-rating__title">Ratings</h2>

    <div v-if="isLoading" class="project-rating__state">Loading ratings&hellip;</div>

    <div v-else-if="error" role="alert" class="project-rating__state project-rating__state--error">
      {{ error }}
    </div>

    <template v-else>
      <div class="project-rating__aggregate">
        <div class="project-rating__score-display">
          <span class="project-rating__average">{{ aggregate.averageScore.toFixed(1) }}</span>
          <span class="project-rating__max">/ 5</span>
        </div>
        <div
          class="project-rating__stars-display"
          :aria-label="`${aggregate.averageScore} out of 5 stars`"
        >
          <span
            v-for="star in 5"
            :key="star"
            aria-hidden="true"
            class="project-rating__star-display"
            :class="{
              'project-rating__star-display--filled': star <= Math.round(aggregate.averageScore),
            }"
          >
            &#9733;
          </span>
        </div>
        <p class="project-rating__count">
          Based on {{ aggregate.ratingCount }} rating{{ aggregate.ratingCount === 1 ? '' : 's' }}
        </p>

        <div v-if="aggregate.ratingCount > 0" class="project-rating__breakdown">
          <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="project-rating__bar-row">
            <span class="project-rating__bar-label">{{ star }}<span aria-hidden="true">&#9733;</span></span>
            <div class="project-rating__bar-track">
              <div
                class="project-rating__bar-fill"
                :style="{ width: `${(aggregate.breakdown[star] / maxBreakdown) * 100}%` }"
              ></div>
            </div>
            <span class="project-rating__bar-count">{{ aggregate.breakdown[star] }}</span>
          </div>
        </div>
      </div>

      <div v-if="!isAuthenticated" class="project-rating__login-note">
        <RouterLink :to="{ name: 'login', query: { redirect: `/projects/${projectId}` } }">
          Log in
        </RouterLink>
        to rate this project.
      </div>

      <form v-else class="project-rating__form" novalidate @submit.prevent="handleSubmit">
        <h3>{{ isEditing ? 'Update your rating' : 'Rate this project' }}</h3>

        <div
          class="project-rating__star-select"
          role="radiogroup"
          aria-label="Rating score"
          :aria-describedby="formErrors.score ? 'rating-score-error' : undefined"
        >
          <button
            v-for="star in 5"
            :key="star"
            :data-star="star"
            type="button"
            role="radio"
            :tabindex="formScore === star ? 0 : -1"
            :aria-checked="formScore === star"
            :aria-label="`${star} star${star === 1 ? '' : 's'}`"
            class="project-rating__star-btn"
            :class="{
              'project-rating__star-btn--filled': star <= (hoverScore || formScore),
            }"
            @click="setScore(star)"
            @keydown="handleStarKeydown($event, star)"
            @mouseenter="hoverScore = star"
            @mouseleave="hoverScore = 0"
            @focus="hoverScore = star"
            @blur="hoverScore = 0"
          >
            &#9733;
          </button>
        </div>
        <FormError id="rating-score-error" :message="formErrors.score" />

        <div class="project-rating__field">
          <label for="rating-comment" class="project-rating__label">
            Comment <span class="project-rating__optional">(optional)</span>
          </label>
          <textarea
            id="rating-comment"
            v-model="formComment"
            class="project-rating__textarea"
            rows="3"
            maxlength="500"
            placeholder="What did you think of this project?"
            :disabled="isSubmitting"
          ></textarea>
          <FormError :message="formErrors.comment" />
        </div>

        <div
          v-if="submitSuccess"
          role="status"
          class="project-rating__banner project-rating__banner--success"
        >
          {{ submitSuccess }}
        </div>
        <div
          v-if="submitError"
          role="alert"
          class="project-rating__banner project-rating__banner--error"
        >
          {{ submitError }}
        </div>

        <div class="project-rating__form-actions">
          <button type="submit" class="project-rating__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving…' : isEditing ? 'Update rating' : 'Submit rating' }}
          </button>
          <button
            v-if="isEditing"
            type="button"
            class="project-rating__delete"
            :disabled="isSubmitting"
            @click="handleDelete"
          >
            Remove rating
          </button>
        </div>
      </form>

      <div v-if="ratings.length > 0" class="project-rating__list">
        <h3>All ratings</h3>
        <ul>
          <li v-for="rating in ratings" :key="rating.id" class="project-rating__item">
            <div class="project-rating__item-header">
              <span class="project-rating__item-name">{{ rating.userName }}</span>
              <span class="project-rating__item-stars" :aria-label="`${rating.score} out of 5 stars`">
                <span
                  v-for="s in 5"
                  :key="s"
                  aria-hidden="true"
                  class="project-rating__star-display"
                  :class="{ 'project-rating__star-display--filled': s <= rating.score }"
                  >&#9733;</span
                >
              </span>
            </div>
            <p v-if="rating.comment" class="project-rating__item-comment">{{ rating.comment }}</p>
          </li>
        </ul>
      </div>

      <p v-else class="project-rating__empty">No ratings yet. Be the first to rate this project.</p>
    </template>
  </section>
</template>

<style scoped>
.project-rating {
  margin-block-start: var(--spacing-xl);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.project-rating__title {
  margin-block-end: var(--spacing-lg);
  font-size: var(--font-size-lg);
}

.project-rating__state {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.project-rating__state--error {
  color: var(--color-error);
}

.project-rating__aggregate {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto auto;
  gap: var(--spacing-sm) var(--spacing-lg);
  align-items: start;
  margin-block-end: var(--spacing-xl);
  padding-block-end: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
}

.project-rating__score-display {
  grid-row: 1 / 3;
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.project-rating__average {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-dark);
  line-height: 1;
}

.project-rating__max {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.project-rating__stars-display {
  grid-row: 1;
  display: flex;
  gap: 2px;
}

.project-rating__star-display {
  font-size: var(--font-size-xl);
  color: var(--color-border);
}

.project-rating__star-display--filled {
  color: #f59e0b;
}

.project-rating__count {
  grid-column: 1 / -1;
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.project-rating__breakdown {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.project-rating__bar-row {
  display: grid;
  grid-template-columns: 32px 1fr 28px;
  align-items: center;
  gap: var(--spacing-sm);
}

.project-rating__bar-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: right;
}

.project-rating__bar-track {
  height: 10px;
  border-radius: 5px;
  background-color: var(--color-background);
  overflow: hidden;
}

.project-rating__bar-fill {
  height: 100%;
  border-radius: 5px;
  background-color: #f59e0b;
  transition: width 0.3s ease;
}

.project-rating__bar-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: right;
}

.project-rating__login-note {
  padding: var(--spacing-md);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--color-text-secondary);
}

.project-rating__login-note a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.project-rating__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-xl);
  padding-block-end: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
}

.project-rating__form h3 {
  font-size: var(--font-size-md);
}

.project-rating__star-select {
  display: flex;
  gap: var(--spacing-xs);
}

.project-rating__star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  font-size: var(--font-size-xl);
  color: var(--color-border);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.project-rating__star-btn:hover,
.project-rating__star-btn:focus-visible {
  border-color: #f59e0b;
  outline: none;
}

.project-rating__star-btn--filled {
  color: #f59e0b;
  border-color: #f59e0b;
  background-color: #fffbeb;
}

.project-rating__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.project-rating__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.project-rating__optional {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
}

.project-rating__textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  font-family: inherit;
  font-size: var(--font-size-sm);
  resize: vertical;
}

.project-rating__textarea:focus-visible {
  border-color: var(--color-primary);
  outline: none;
}

.project-rating__banner {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
}

.project-rating__banner--success {
  border: 1px solid var(--color-success);
  background-color: #e8f5e9;
  color: var(--color-success);
}

.project-rating__banner--error {
  border: 1px solid var(--color-error);
  background-color: #fdecea;
  color: var(--color-error);
}

.project-rating__form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.project-rating__submit {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.project-rating__submit:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.project-rating__submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.project-rating__delete {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: transparent;
  color: var(--color-error);
  font-weight: var(--font-weight-semibold);
}

.project-rating__delete:hover:not(:disabled) {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.project-rating__list h3 {
  margin-block-end: var(--spacing-md);
  font-size: var(--font-size-md);
}

.project-rating__list ul {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.project-rating__item {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
}

.project-rating__item-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.project-rating__item-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}

.project-rating__item-stars {
  display: flex;
  gap: 1px;
}

.project-rating__item-stars .project-rating__star-display {
  font-size: var(--font-size-sm);
}

.project-rating__item-comment {
  margin-block-start: var(--spacing-xs);
  margin-block-end: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.project-rating__empty {
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--color-text-secondary);
}

@media (min-width: 576px) {
  .project-rating__aggregate {
    grid-template-columns: auto 1fr auto;
  }

  .project-rating__score-display {
    grid-row: 1;
  }

  .project-rating__stars-display {
    grid-row: 1;
    align-self: center;
  }

  .project-rating__count {
    grid-column: 3;
    grid-row: 1;
    text-align: right;
  }

  .project-rating__breakdown {
    grid-column: 1 / -1;
  }
}
</style>
