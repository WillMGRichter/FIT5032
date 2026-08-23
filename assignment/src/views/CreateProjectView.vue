<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProjectFormFields from '@/components/forms/ProjectFormFields.vue'
import { createProject } from '@/services/projectService'
import { getCategories } from '@/services/categoryService'
import { ApiError } from '@/services/api'
import { createEmptyProjectForm, useProjectValidation } from '@/composables/useProjectValidation'

const router = useRouter()

const form = reactive(createEmptyProjectForm())
const { errors, validate, applyServerErrors } = useProjectValidation(form)

const categories = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const submitError = ref(null)
const isSuccess = ref(false)

async function loadCategories() {
  isLoading.value = true
  try {
    categories.value = (await getCategories()) ?? []
  } catch {
    submitError.value = 'Could not load project categories. Please refresh the page and try again.'
  } finally {
    isLoading.value = false
  }
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
  if (isSubmitting.value || isSuccess.value) return

  submitError.value = null
  if (!validate()) {
    submitError.value = 'Please fix the highlighted fields and try again.'
    return
  }

  isSubmitting.value = true
  try {
    const created = await createProject(buildPayload())

    isSuccess.value = true
    setTimeout(() => {
      router.push({ name: 'project-details', params: { id: created.id } })
    }, 1200)
  } catch (err) {
    if (err instanceof ApiError && err.status === 400 && err.details?.errors) {
      applyServerErrors(err.details.errors)
      submitError.value =
        'The server rejected some of these values. Please review the highlighted fields.'
    } else {
      submitError.value =
        err && err.message ? err.message : 'Something went wrong while creating the project.'
    }
  } finally {
    isSubmitting.value = false
  }
}

function onFieldUpdate({ field, value }) {
  form[field] = value
}

loadCategories()
</script>

<template>
  <section class="create" aria-labelledby="create-heading">
    <header class="create__header">
      <h1 id="create-heading">Create a Project</h1>
      <p class="create__intro">
        Share a greening project with GreenLink volunteers. Fields marked
        <span class="create__required" aria-hidden="true">*</span> are required.
      </p>
    </header>

    <div v-if="isSuccess" role="status" class="create__success">
      <h2>Project created!</h2>
      <p>Taking you to your new project page&hellip;</p>
    </div>

    <form v-else class="create__form" novalidate @submit.prevent="handleSubmit">
      <ProjectFormFields
        :form="form"
        :errors="errors"
        :categories="categories"
        id-prefix="create"
        :disabled="isSubmitting"
        @update="onFieldUpdate"
      />

      <div v-if="submitError" role="alert" class="create__alert">{{ submitError }}</div>

      <div class="create__actions">
        <button type="submit" class="create__submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Creating project…' : 'Create project' }}
        </button>
        <RouterLink :to="{ name: 'discover' }" class="create__cancel">Cancel</RouterLink>
      </div>
    </form>
  </section>
</template>

<style scoped>
.create__header {
  margin-block-end: var(--spacing-xl);
}

.create__required {
  color: var(--color-error);
}

.create__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.create__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  max-width: 720px;
}

.create__success {
  padding: var(--spacing-xl);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
  color: var(--color-success);
}

.create__success h2 {
  font-size: var(--font-size-lg);
}

.create__success p {
  margin-block-start: var(--spacing-xs);
}

.create__alert {
  padding: var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
}

.create__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.create__submit {
  padding: var(--spacing-sm) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.create__submit:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.create__submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.create__cancel {
  color: var(--color-text-secondary);
}

.create__cancel:hover {
  color: var(--color-text);
}
</style>
