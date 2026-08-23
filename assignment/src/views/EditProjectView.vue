<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProjectFormFields from '@/components/forms/ProjectFormFields.vue'
import { getProjectById, updateProject } from '@/services/projectService'
import { getCategories } from '@/services/categoryService'
import { ApiError } from '@/services/api'
import { createEmptyProjectForm, useProjectValidation } from '@/composables/useProjectValidation'

const route = useRoute()
const router = useRouter()

const project = ref(null)
const isLoading = ref(true)
const loadError = ref(null)

const form = reactive(createEmptyProjectForm())
const { errors, validate, applyServerErrors } = useProjectValidation(form)

const categories = ref([])
const isSubmitting = ref(false)
const submitError = ref(null)
const isSuccess = ref(false)

const isNotFound = computed(() => !isLoading.value && !loadError.value && !project.value)

function populateForm(data) {
  form.title = data.title ?? ''
  form.description = data.description ?? ''
  form.categoryId = data.categoryId ?? ''
  form.location = data.location ?? ''
  form.latitude = data.latitude != null ? String(data.latitude) : ''
  form.longitude = data.longitude != null ? String(data.longitude) : ''
  form.image = data.image ?? ''
  form.startDate = data.startDate ?? ''
  form.endDate = data.endDate ?? ''
  form.capacity = data.capacity != null ? String(data.capacity) : ''
  form.status = data.status ?? 'planned'
}

async function loadPage(id) {
  if (!id) return
  isLoading.value = true
  loadError.value = null
  project.value = null
  isSuccess.value = false

  try {
    const [data, categoryData] = await Promise.all([getProjectById(id), getCategories()])

    if (data === null) return
    if (categoryData === null) throw new Error('Could not load categories.')

    project.value = data
    categories.value = categoryData
    populateForm(data)
  } catch (err) {
    loadError.value =
      err && err.message ? err.message : 'Something went wrong while loading this project.'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => loadPage(id),
  { immediate: true },
)

function onFieldUpdate({ field, value }) {
  form[field] = value
}

function buildPayload() {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId,
    location: form.location.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    image: form.image.trim() || null,
    startDate: form.startDate,
    endDate: form.endDate,
    capacity: Number(form.capacity),
    status: form.status,
  }
}

async function handleSubmit() {
  if (isSubmitting.value || !project.value) return

  submitError.value = null
  if (!validate()) {
    submitError.value = 'Please fix the highlighted fields and try again.'
    return
  }

  isSubmitting.value = true
  try {
    await updateProject(project.value.id, buildPayload())

    isSuccess.value = true
    setTimeout(() => {
      router.push({ name: 'project-details', params: { id: project.value.id } })
    }, 1200)
  } catch (err) {
    if (err instanceof ApiError && err.status === 400 && err.details?.errors) {
      applyServerErrors(err.details.errors)
      submitError.value =
        'The server rejected some of these values. Please review the highlighted fields.'
    } else {
      submitError.value =
        err && err.message ? err.message : 'Something went wrong while saving the project.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="edit" aria-labelledby="edit-heading">
    <nav class="edit__breadcrumb">
      <RouterLink :to="{ name: 'discover' }">&larr; Back to Discover</RouterLink>
    </nav>

    <p v-if="isLoading" class="edit__state">Loading project&hellip;</p>

    <div v-else-if="isNotFound" class="edit__state">
      <h1 id="edit-heading">Project not found</h1>
      <p>This project may have been removed or the link is incorrect.</p>
      <RouterLink :to="{ name: 'discover' }" class="edit__back">Back to Discover</RouterLink>
    </div>

    <div v-else-if="loadError" role="alert" class="edit__state edit__state--error">
      <h1 id="edit-heading">We couldn't load this project</h1>
      <p>{{ loadError }}</p>
      <button type="button" class="edit__submit" @click="loadPage(route.params.id)">
        Try again
      </button>
    </div>

    <template v-else>
      <header class="edit__header">
        <h1 id="edit-heading">Edit Project</h1>
        <p class="edit__intro">
          Updating &ldquo;{{ project.title }}&rdquo;. Fields marked
          <span class="edit__required" aria-hidden="true">*</span> are required.
        </p>
      </header>

      <div v-if="isSuccess" role="status" class="edit__success">
        <h2>Changes saved!</h2>
        <p>Taking you back to the project page&hellip;</p>
      </div>

      <form v-else class="edit__form" novalidate @submit.prevent="handleSubmit">
        <ProjectFormFields
          :form="form"
          :errors="errors"
          :categories="categories"
          id-prefix="edit"
          :disabled="isSubmitting"
          @update="onFieldUpdate"
        />

        <div v-if="submitError" role="alert" class="edit__alert">{{ submitError }}</div>

        <div class="edit__actions">
          <button type="submit" class="edit__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving changes…' : 'Save changes' }}
          </button>
          <RouterLink
            :to="{ name: 'project-details', params: { id: project.id } }"
            class="edit__cancel"
          >
            Cancel
          </RouterLink>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.edit__breadcrumb {
  margin-block-end: var(--spacing-md);
}

.edit__breadcrumb a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.edit__header {
  margin-block-end: var(--spacing-xl);
}

.edit__required {
  color: var(--color-error);
}

.edit__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.edit__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.edit__state h1 {
  font-size: var(--font-size-lg);
  margin-block-end: var(--spacing-sm);
}

.edit__state p {
  color: var(--color-text-secondary);
  margin-block-end: var(--spacing-md);
}

.edit__state--error h1 {
  color: var(--color-error);
}

.edit__back {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.edit__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  max-width: 720px;
}

.edit__success {
  padding: var(--spacing-xl);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
  color: var(--color-success);
}

.edit__success h2 {
  font-size: var(--font-size-lg);
}

.edit__success p {
  margin-block-start: var(--spacing-xs);
}

.edit__alert {
  padding: var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
}

.edit__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.edit__submit {
  padding: var(--spacing-sm) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.edit__submit:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.edit__submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.edit__cancel {
  color: var(--color-text-secondary);
}

.edit__cancel:hover {
  color: var(--color-text);
}
</style>
