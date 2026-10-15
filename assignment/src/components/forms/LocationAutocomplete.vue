<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import FormError from './FormError.vue'

defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: [String, Number], default: '' },
  error: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'select'])

const SUGGESTION_LIMIT = 5
const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300
const LABEL_MAX = 160

const root = ref(null)
const suggestions = ref([])
const isOpen = ref(false)
const isSearching = ref(false)
const highlighted = ref(-1)
const statusMessage = ref('')

let debounceTimer = null
let controller = null
let requestSeq = 0

function searchUrl(query) {
  return `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${SUGGESTION_LIMIT}&lang=en`
}

function dedupe(parts) {
  const seen = new Set()
  const unique = []
  for (const part of parts) {
    const value = String(part ?? '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(value)
  }
  return unique
}

function buildLabel(properties) {
  const parts = dedupe([
    properties.name,
    properties.city,
    properties.state,
    properties.country,
  ])
  let label = parts.join(', ') || properties.osm_value || properties.type || 'Selected location'
  if (label.length > LABEL_MAX) label = `${label.slice(0, LABEL_MAX - 1).trimEnd()}\u2026`
  return label
}

function primaryText(place) {
  return place.properties.name || place.properties.street || place.properties.city || 'Location'
}

function secondaryText(place) {
  const { name, street, city, state, country } = place.properties
  const parts = dedupe([street !== name ? street : null, city, state, country])
  return parts.join(', ')
}

function cancelInflight() {
  if (controller) {
    controller.abort()
    controller = null
  }
}

function resetSuggestions(clearStatus = true) {
  suggestions.value = []
  isOpen.value = false
  highlighted.value = -1
  if (clearStatus) statusMessage.value = ''
}

function queueSearch(value) {
  clearTimeout(debounceTimer)
  const query = String(value ?? '').trim()

  if (query.length < MIN_QUERY_LENGTH) {
    cancelInflight()
    isSearching.value = false
    resetSuggestions()
    return
  }

  debounceTimer = setTimeout(() => runSearch(query), DEBOUNCE_MS)
}

async function runSearch(query) {
  const seq = ++requestSeq
  cancelInflight()
  controller = new AbortController()
  isSearching.value = true
  statusMessage.value = ''

  try {
    const response = await fetch(searchUrl(query), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (seq !== requestSeq) return
    if (!response.ok) throw new Error('search failed')

    const data = await response.json()
    if (seq !== requestSeq) return

    const features = Array.isArray(data?.features) ? data.features : []
    suggestions.value = features.slice(0, SUGGESTION_LIMIT)
    isOpen.value = suggestions.value.length > 0
    highlighted.value = -1
    if (suggestions.value.length === 0) {
      statusMessage.value = `No places found for "${query}". Try a street, suburb or landmark.`
    }
  } catch (error) {
    if (seq !== requestSeq || error?.name === 'AbortError') return
    resetSuggestions()
    statusMessage.value = 'Could not search places right now. Check your connection and try again.'
  } finally {
    if (seq === requestSeq) isSearching.value = false
  }
}

function chooseSuggestion(place) {
  const { coordinates } = place.geometry
  const longitude = Number(coordinates?.[0])
  const latitude = Number(coordinates?.[1])
  const label = buildLabel(place.properties)

  emit('update:modelValue', label)
  emit('select', {
    label,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    displayName: secondaryText(place) ? `${primaryText(place)}, ${secondaryText(place)}` : primaryText(place),
    place,
  })

  resetSuggestions()
}

function onInput(event) {
  emit('update:modelValue', event.target.value)
  queueSearch(event.target.value)
}

function move(delta) {
  if (suggestions.value.length === 0) return
  const count = suggestions.value.length
  highlighted.value = (highlighted.value + delta + count) % count
  isOpen.value = true
}

function onKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    if (isOpen.value && highlighted.value >= 0) {
      event.preventDefault()
      chooseSuggestion(suggestions.value[highlighted.value])
    }
  } else if (event.key === 'Escape') {
    if (isOpen.value) {
      event.preventDefault()
      resetSuggestions(false)
    }
  }
}

function onFocus() {
  if (suggestions.value.length > 0) isOpen.value = true
}

function onDocumentPointerDown(event) {
  if (root.value && !root.value.contains(event.target)) {
    resetSuggestions(false)
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  clearTimeout(debounceTimer)
  cancelInflight()
})
</script>

<template>
  <div ref="root" class="form-field location-field" :class="{ 'form-field--error': Boolean(error) }">
    <label :for="id" class="form-field__label">
      {{ label }}
      <span v-if="required" class="form-field__required" aria-hidden="true">*</span>
    </label>

    <div class="location-field__control">
      <input
        :id="id"
        type="text"
        class="form-field__control location-field__input"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="isOpen"
        :aria-controls="`${id}-listbox`"
        :aria-activedescendant="isOpen && highlighted >= 0 ? `${id}-option-${highlighted}` : undefined"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${id}-error` : statusMessage ? `${id}-status` : undefined"
        @input="onInput"
        @keydown="onKeydown"
        @focus="onFocus"
      />

      <span v-if="isSearching" class="location-field__spinner" aria-hidden="true"></span>
    </div>

    <ul
      v-if="isOpen"
      :id="`${id}-listbox`"
      class="location-field__list"
      role="listbox"
      :aria-label="`Location suggestions for ${label}`"
    >
      <li
        v-for="(place, index) in suggestions"
        :id="`${id}-option-${index}`"
        :key="place.properties.osm_id ?? `${place.properties.name}-${index}`"
        class="location-field__option"
        :class="{ 'location-field__option--active': index === highlighted }"
        role="option"
        :aria-selected="index === highlighted"
        @mouseenter="highlighted = index"
        @mousedown.prevent="chooseSuggestion(place)"
      >
        <span class="location-field__option-title">{{ primaryText(place) }}</span>
        <span v-if="secondaryText(place)" class="location-field__option-sub">{{ secondaryText(place) }}</span>
      </li>
      <li class="location-field__attribution" role="presentation">
        Search by Photon &middot; &copy; OpenStreetMap contributors
      </li>
    </ul>

    <p v-if="!isOpen && statusMessage && !error" :id="`${id}-status`" class="location-field__hint">
      {{ statusMessage }}
    </p>

    <FormError :id="`${id}-error`" :message="error" />
  </div>
</template>

<style scoped>
.location-field {
  position: relative;
}

.location-field__control {
  position: relative;
  display: flex;
}

.location-field__input {
  padding-inline-end: var(--spacing-xl);
}

.location-field__spinner {
  position: absolute;
  top: 50%;
  right: var(--spacing-md);
  width: 14px;
  height: 14px;
  margin-top: -7px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: location-field-spin 0.7s linear infinite;
}

.location-field__list {
  position: absolute;
  z-index: 40;
  top: 100%;
  left: 0;
  right: 0;
  margin: var(--spacing-xs) 0 0;
  padding: var(--spacing-xs);
  max-height: 280px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-md, 0 6px 18px rgba(0, 0, 0, 0.12));
}

.location-field__option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.location-field__option--active {
  background-color: var(--color-background);
}

.location-field__option-title {
  font-weight: var(--font-weight-medium);
}

.location-field__option-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.location-field__attribution {
  padding: var(--spacing-xs) var(--spacing-md);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.location-field__hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

@keyframes location-field-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .location-field__spinner {
    animation-duration: 1.6s;
  }
}
</style>
