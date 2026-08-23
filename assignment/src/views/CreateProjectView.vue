<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import { createProject } from '@/services/projectService'
import { getCategories } from '@/services/categoryService'

const router = useRouter()

const initialForm = {
  title: '',
  description: '',
  categoryId: '',
  location: '',
  latitude: '',
  longitude: '',
  image: '',
  startDate: '',
  endDate: '',
  capacity: '',
  status: 'planned',
}

const form = reactive({ ...initialForm })
const errors = reactive({})
const categories = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const submitError = ref(null)
const isSuccess = ref(false)

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

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

function validate() {
  const nextErrors = {}

  if (!form.title.trim()) {
    nextErrors.title = 'Project title is required.'
  }

  if (!form.description.trim()) {
    nextErrors.description = 'Please describe what volunteers will do in this project.'
  }

  if (!form.categoryId) {
    nextErrors.categoryId = 'Please choose a category.'
  }

  if (!form.location.trim()) {
    nextErrors.location = 'Location is required, e.g. "Royal Park, Parkville".'
  }

  const latitude = Number(form.latitude)
  if (form.latitude === '' || !Number.isFinite(latitude)) {
    nextErrors.latitude = 'Latitude must be a number, e.g. -37.8515.'
  } else if (latitude < -90 || latitude > 90) {
    nextErrors.latitude = 'Latitude must be between -90 and 90.'
  }

  const longitude = Number(form.longitude)
  if (form.longitude === '' || !Number.isFinite(longitude)) {
    nextErrors.longitude = 'Longitude must be a number, e.g. 144.9510.'
  } else if (longitude < -180 || longitude > 180) {
    nextErrors.longitude = 'Longitude must be between -180 and 180.'
  }

  const capacity = Number(form.capacity)
  if (form.capacity === '' || !Number.isInteger(capacity) || capacity <= 0) {
    nextErrors.capacity = 'Capacity must be a whole number greater than zero.'
  }

  if (!form.startDate) {
    nextErrors.startDate = 'Start date is required.'
  }

  if (!form.endDate) {
    nextErrors.endDate = 'End date is required.'
  } else if (form.startDate && form.endDate < form.startDate) {
    nextErrors.endDate = "End date can't be before the start date."
  }

  Object.keys(errors).forEach((key) => delete errors[key])
  Object.assign(errors, nextErrors)
  return Object.keys(nextErrors).length === 0
}

watch(form, (next, previous) => {
  for (const key of Object.keys(next)) {
    if (next[key] !== previous[key]) {
      delete errors[key]
    }
  }
})

function fieldError(key) {
  return errors[key] ?? ''
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
    const created = await createProject({
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
    })

    isSuccess.value = true
    setTimeout(() => {
      router.push({ name: 'project-details', params: { id: created.id } })
    }, 1200)
  } catch (err) {
    submitError.value =
      err && err.message ? err.message : 'Something went wrong while creating the project.'
  } finally {
    isSubmitting.value = false
  }
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
      <fieldset class="create__fieldset">
        <legend>About the project</legend>
        <FormInput
          id="title"
          v-model="form.title"
          label="Project title"
          type="text"
          required
          placeholder="e.g. Royal Park Canopy Revival"
          :error="fieldError('title')"
        />
        <FormTextarea
          id="description"
          v-model="form.description"
          label="Description"
          required
          placeholder="What will volunteers do? What impact will the project have?"
          :error="fieldError('description')"
        />
        <FormSelect
          id="categoryId"
          v-model="form.categoryId"
          label="Category"
          placeholder="Choose a category"
          :options="categories.map((category) => ({ value: category.id, label: category.name }))"
          :error="fieldError('categoryId')"
          required
        />
      </fieldset>

      <fieldset class="create__fieldset">
        <legend>Where it happens</legend>
        <FormInput
          id="location"
          v-model="form.location"
          label="Location"
          type="text"
          required
          placeholder="e.g. Royal Park, Parkville"
          :error="fieldError('location')"
        />
        <div class="create__row">
          <FormInput
            id="latitude"
            v-model="form.latitude"
            label="Latitude"
            type="number"
            step="any"
            min="-90"
            max="90"
            placeholder="-37.8515"
            :error="fieldError('latitude')"
          />
          <FormInput
            id="longitude"
            v-model="form.longitude"
            label="Longitude"
            type="number"
            step="any"
            min="-180"
            max="180"
            placeholder="144.9510"
            :error="fieldError('longitude')"
          />
        </div>
        <FormInput
          id="image"
          v-model="form.image"
          label="Image URL (optional)"
          type="url"
          placeholder="https://example.com/photo.jpg"
          :error="fieldError('image')"
        />
      </fieldset>

      <fieldset class="create__fieldset">
        <legend>When &amp; who</legend>
        <div class="create__row">
          <FormInput
            id="startDate"
            v-model="form.startDate"
            label="Start date"
            type="date"
            required
            :error="fieldError('startDate')"
          />
          <FormInput
            id="endDate"
            v-model="form.endDate"
            label="End date"
            type="date"
            required
            :error="fieldError('endDate')"
          />
        </div>
        <div class="create__row">
          <FormInput
            id="capacity"
            v-model="form.capacity"
            label="Volunteer capacity"
            type="number"
            min="1"
            step="1"
            placeholder="50"
            :error="fieldError('capacity')"
          />
          <FormSelect
            id="status"
            v-model="form.status"
            label="Status"
            placeholder=""
            :options="statusOptions"
            :error="fieldError('status')"
          />
        </div>
      </fieldset>

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

.create__fieldset {
  display: grid;
  gap: var(--spacing-md);
  margin: 0;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.create__fieldset legend {
  padding-inline: var(--spacing-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-dark);
}

.create__row {
  display: grid;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .create__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.create__success {
  max-width: 720px;
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
