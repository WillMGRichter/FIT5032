<script setup>
import FormInput from './FormInput.vue'
import FormTextarea from './FormTextarea.vue'
import FormSelect from './FormSelect.vue'
import FormNumberInput from './FormNumberInput.vue'
import FormCheckboxGroup from './FormCheckboxGroup.vue'
import { PROJECT_STATUS_OPTIONS } from '@/composables/useProjectValidation'

defineProps({
  form: { type: Object, required: true },
  errors: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  plants: { type: Array, default: () => [] },
  idPrefix: { type: String, default: 'project' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update'])

function set(field, value) {
  emit('update', { field, value })
}
</script>

<template>
  <fieldset class="project-fields__fieldset" :disabled="disabled">
    <legend>About the project</legend>
    <FormInput
      :id="`${idPrefix}-title`"
      :model-value="form.title"
      label="Project title"
      type="text"
      required
      placeholder="e.g. Royal Park Canopy Revival"
      :error="errors.title ?? ''"
      @update:model-value="set('title', $event)"
    />
    <FormTextarea
      :id="`${idPrefix}-description`"
      :model-value="form.description"
      label="Description"
      required
      placeholder="What will volunteers do? What impact will the project have?"
      :error="errors.description ?? ''"
      @update:model-value="set('description', $event)"
    />
    <FormSelect
      :id="`${idPrefix}-category`"
      :model-value="form.categoryId"
      label="Category"
      placeholder="Choose a category"
      :options="categories.map((category) => ({ value: category.id, label: category.name }))"
      :error="errors.categoryId ?? ''"
      required
      @update:model-value="set('categoryId', $event)"
    />
  </fieldset>

  <fieldset class="project-fields__fieldset" :disabled="disabled">
    <legend>Where it happens</legend>
    <FormInput
      :id="`${idPrefix}-location`"
      :model-value="form.location"
      label="Location"
      type="text"
      required
      placeholder="e.g. Royal Park, Parkville"
      :error="errors.location ?? ''"
      @update:model-value="set('location', $event)"
    />
    <div class="project-fields__row">
      <FormNumberInput
        :id="`${idPrefix}-latitude`"
        :model-value="form.latitude"
        label="Latitude"
        step="any"
        min="-90"
        max="90"
        placeholder="-37.8515"
        :error="errors.latitude ?? ''"
        @update:model-value="set('latitude', $event)"
      />
      <FormNumberInput
        :id="`${idPrefix}-longitude`"
        :model-value="form.longitude"
        label="Longitude"
        step="any"
        min="-180"
        max="180"
        placeholder="144.9510"
        :error="errors.longitude ?? ''"
        @update:model-value="set('longitude', $event)"
      />
    </div>
    <FormInput
      :id="`${idPrefix}-image`"
      :model-value="form.image"
      label="Image URL (optional)"
      type="url"
      placeholder="https://example.com/photo.jpg"
      :error="errors.image ?? ''"
      @update:model-value="set('image', $event)"
    />
  </fieldset>

  <fieldset class="project-fields__fieldset" :disabled="disabled">
    <legend>When &amp; who</legend>
    <div class="project-fields__row">
      <FormInput
        :id="`${idPrefix}-start-date`"
        :model-value="form.startDate"
        label="Start date"
        type="date"
        required
        :error="errors.startDate ?? ''"
        @update:model-value="set('startDate', $event)"
      />
      <FormInput
        :id="`${idPrefix}-end-date`"
        :model-value="form.endDate"
        label="End date"
        type="date"
        required
        :error="errors.endDate ?? ''"
        @update:model-value="set('endDate', $event)"
      />
    </div>
    <div class="project-fields__row">
      <FormNumberInput
        :id="`${idPrefix}-capacity`"
        :model-value="form.capacity"
        label="Volunteer capacity"
        min="1"
        step="1"
        placeholder="50"
        :error="errors.capacity ?? ''"
        @update:model-value="set('capacity', $event)"
      />
      <FormSelect
        :id="`${idPrefix}-status`"
        :model-value="form.status"
        label="Status"
        placeholder=""
        :options="PROJECT_STATUS_OPTIONS"
        :error="errors.status ?? ''"
        @update:model-value="set('status', $event)"
      />
    </div>
  </fieldset>

  <fieldset class="project-fields__fieldset" :disabled="disabled">
    <legend>Native plants</legend>
    <FormCheckboxGroup
      v-if="plants.length > 0"
      :id="`${idPrefix}-plants`"
      name="plantIds"
      label="Select the native species this project will plant (optional)"
      :options="
        plants.map((plant) => ({
          value: plant.id,
          label: `${plant.commonName} (${plant.scientificName})`,
        }))
      "
      :model-value="form.plantIds"
      :error="errors.plantIds ?? ''"
      @update:model-value="set('plantIds', $event)"
    />
    <p v-else class="project-fields__hint">No native plants available to select right now.</p>
  </fieldset>
</template>

<style scoped>
.project-fields__fieldset {
  display: grid;
  gap: var(--spacing-md);
  margin: 0;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

@media (min-width: 768px) {
  .project-fields__fieldset {
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
  }
}

.project-fields__fieldset legend {
  padding-inline: var(--spacing-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-dark);
}

.project-fields__row {
  display: grid;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .project-fields__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.project-fields__hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
