<script setup>
import { computed, onMounted, ref } from 'vue'
import PlantCard from '@/components/plant/PlantCard.vue'
import { getPlants } from '@/services/plantService'

const plants = ref([])
const isLoading = ref(true)
const error = ref(null)

const searchQuery = ref('')
const selectedMaintenance = ref('')
const selectedHabitat = ref('')
const sortBy = ref('name')

const maintenanceOptions = [
  { value: 'low', label: 'Low maintenance' },
  { value: 'medium', label: 'Medium maintenance' },
  { value: 'high', label: 'High maintenance' },
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Common name' },
  { value: 'maintenance', label: 'Maintenance level' },
]

const habitatOptions = computed(() => {
  const habitats = plants.value.map((p) => p.habitat).filter(Boolean)
  return [...new Set(habitats)].sort()
})

const hasActiveFilters = computed(
  () =>
    searchQuery.value.trim() !== '' ||
    selectedMaintenance.value !== '' ||
    selectedHabitat.value !== '',
)

function clearFilters() {
  searchQuery.value = ''
  selectedMaintenance.value = ''
  selectedHabitat.value = ''
  sortBy.value = 'name'
}

const filteredPlants = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  let list = plants.value.filter((plant) => {
    const matchesQuery =
      query === '' ||
      plant.commonName.toLowerCase().includes(query) ||
      plant.scientificName.toLowerCase().includes(query)
    const matchesMaintenance =
      selectedMaintenance.value === '' || plant.maintenanceLevel === selectedMaintenance.value
    const matchesHabitat = selectedHabitat.value === '' || plant.habitat === selectedHabitat.value
    return matchesQuery && matchesMaintenance && matchesHabitat
  })

  const key = sortBy.value
  if (key === 'maintenance') {
    const order = { low: 0, medium: 1, high: 2 }
    list = [...list].sort(
      (a, b) => (order[a.maintenanceLevel] ?? 0) - (order[b.maintenanceLevel] ?? 0),
    )
  } else {
    list = [...list].sort((a, b) => (a.commonName ?? '').localeCompare(b.commonName ?? ''))
  }

  return list
})

async function loadPage() {
  isLoading.value = true
  error.value = null
  try {
    plants.value = (await getPlants()) ?? []
  } catch (err) {
    error.value =
      err instanceof Error && err.message
        ? err.message
        : 'Something went wrong while loading plants.'
    plants.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <section class="plants" aria-labelledby="plants-heading">
    <header class="plants__header">
      <h1 id="plants-heading">Native Plants</h1>
      <p class="plants__intro">
        The indigenous species GreenLink projects plant to rebuild habitat and canopy across
        Melbourne.
      </p>
    </header>

    <p v-if="isLoading" class="plants__state">Loading plants&hellip;</p>

    <div v-else-if="error" role="alert" class="plants__state plants__state--error">
      <h2>We couldn't load plants</h2>
      <p>{{ error }}</p>
      <button type="button" class="plants__button" @click="loadPage">Try again</button>
    </div>

    <template v-else>
      <form class="plants__toolbar" role="search" @submit.prevent>
        <input
          v-model="searchQuery"
          type="search"
          class="plants__input plants__search"
          placeholder="Search by common or scientific name"
          aria-label="Search plants"
        />
        <select
          v-model="selectedMaintenance"
          class="plants__input"
          aria-label="Filter by maintenance level"
        >
          <option value="">All maintenance levels</option>
          <option v-for="option in maintenanceOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="selectedHabitat" class="plants__input" aria-label="Filter by habitat">
          <option value="">All habitats</option>
          <option v-for="habitat in habitatOptions" :key="habitat" :value="habitat">
            {{ habitat }}
          </option>
        </select>
        <select v-model="sortBy" class="plants__input" aria-label="Sort by">
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
            Sort: {{ option.label }}
          </option>
        </select>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="plants__button plants__button--clear"
          @click="clearFilters"
        >
          Clear Filters
        </button>
      </form>

      <p class="plants__count" role="status">
        Showing {{ filteredPlants.length }} of {{ plants.length }} plants
      </p>

      <ul v-if="filteredPlants.length > 0" class="plants__grid">
        <li v-for="plant in filteredPlants" :key="plant.id" class="plants__item">
          <PlantCard :plant="plant" />
        </li>
      </ul>

      <div v-else-if="plants.length === 0" class="plants__state plants__state--empty">
        <h2>No plants yet</h2>
        <p>There are no plants to show right now. Check back soon!</p>
      </div>

      <div v-else class="plants__state plants__state--empty">
        <h2>No plants match your search</h2>
        <p>Try changing your search or filters.</p>
        <button type="button" class="plants__button" @click="clearFilters">Clear Filters</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.plants__header {
  margin-block-end: var(--spacing-xl);
}

.plants__intro {
  margin-top: var(--spacing-sm);
  max-width: 60ch;
  color: var(--color-text-secondary);
}

.plants__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--spacing-sm);
  margin-block-end: var(--spacing-md);
}

.plants__input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  min-width: 0;
}

.plants__input:focus-visible {
  outline-offset: 0;
  border-color: var(--color-primary);
}

.plants__button {
  justify-self: start;
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.plants__button:hover {
  background-color: var(--color-primary-dark);
}

@media (min-width: 576px) {
  .plants__toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-md);
  }

  .plants__search {
    grid-column: 1 / -1;
  }

  .plants__button--clear {
    justify-self: start;
  }
}

@media (min-width: 768px) {
  .plants__toolbar {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: center;
  }

  .plants__search {
    grid-column: auto;
  }

  .plants__button--clear {
    justify-self: end;
  }
}

.plants__count {
  margin-block-end: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.plants__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.plants__state h2 {
  font-size: var(--font-size-lg);
}

.plants__state p {
  margin-block-start: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.plants__state--error h2 {
  color: var(--color-error);
}

.plants__state .plants__button {
  margin-top: var(--spacing-md);
}

.plants__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: var(--spacing-lg);
}

@media (min-width: 1200px) {
  .plants__grid {
    gap: var(--spacing-xl);
  }
}

.plants__item {
  display: flex;
}
</style>
