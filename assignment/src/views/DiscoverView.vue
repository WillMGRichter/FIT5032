<script setup>
import { onMounted, ref } from 'vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import ProjectMap from '@/components/common/ProjectMap.vue'
import { getProjects } from '@/services/projectService'
import { getCategories } from '@/services/categoryService'
import { useProjectFilters } from '@/composables/useProjectFilters'

const projects = ref([])
const categories = ref([])
const isLoading = ref(true)
const error = ref(null)

const {
  searchQuery,
  selectedCategory,
  selectedStatus,
  filteredProjects,
  hasActiveFilters,
  clearFilters,
} = useProjectFilters(projects)

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

async function loadPage() {
  isLoading.value = true
  error.value = null
  try {
    const [projectData, categoryData] = await Promise.all([getProjects(), getCategories()])
    projects.value = projectData ?? []
    categories.value = categoryData ?? []
  } catch (err) {
    error.value =
      err instanceof Error && err.message
        ? err.message
        : 'Something went wrong while loading projects.'
    projects.value = []
    categories.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <section class="discover" aria-labelledby="discover-heading">
    <header class="discover__header">
      <h1 id="discover-heading">Discover Projects</h1>
      <p class="discover__intro">
        Join hands-on greening projects across Melbourne and help restore habitat, canopy and
        community.
      </p>
    </header>

    <p v-if="isLoading" class="discover__state">Loading projects&hellip;</p>

    <div v-else-if="error" role="alert" class="discover__state discover__state--error">
      <h2>We couldn't load projects</h2>
      <p>{{ error }}</p>
      <button type="button" class="discover__button" @click="loadPage">Try again</button>
    </div>

    <template v-else>
      <form class="discover__toolbar" role="search" @submit.prevent>
        <input
          v-model="searchQuery"
          type="search"
          class="discover__input discover__search"
          placeholder="Search by title or description"
          aria-label="Search projects"
        />
        <select v-model="selectedCategory" class="discover__input" aria-label="Filter by category">
          <option value="">All categories</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
        <select v-model="selectedStatus" class="discover__input" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option v-for="status in statusOptions" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="discover__button discover__button--clear"
          @click="clearFilters"
        >
          Clear Filters
        </button>
      </form>

      <p class="discover__count" role="status">
        Showing {{ filteredProjects.length }} of {{ projects.length }} projects
      </p>

      <section class="discover__map" aria-labelledby="discover-map-heading">
        <h2 id="discover-map-heading">Explore on the map</h2>
        <ProjectMap :projects="filteredProjects" :is-loading="isLoading" />
      </section>

      <ul v-if="filteredProjects.length > 0" class="discover__grid">
        <li v-for="project in filteredProjects" :key="project.id" class="discover__item">
          <ProjectCard :project="project" />
        </li>
      </ul>

      <div v-else-if="projects.length === 0" class="discover__state discover__state--empty">
        <h2>No projects yet</h2>
        <p>There are no projects to show right now. Check back soon!</p>
      </div>

      <div v-else class="discover__state discover__state--empty">
        <h2>No projects match your search</h2>
        <p>Try adjusting your keywords or removing some filters.</p>
        <button type="button" class="discover__button" @click="clearFilters">Clear Filters</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.discover__header {
  margin-block-end: var(--spacing-xl);
}

.discover__intro {
  margin-top: var(--spacing-sm);
  max-width: 60ch;
  color: var(--color-text-secondary);
}

.discover__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--spacing-sm);
  margin-block-end: var(--spacing-md);
}

.discover__input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  min-width: 0;
}

.discover__input:focus-visible {
  outline-offset: 0;
  border-color: var(--color-primary);
}

.discover__button {
  justify-self: start;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.discover__button:hover {
  background-color: var(--color-primary-dark);
}

/* Small tablets: search full-width, filters side by side */
@media (min-width: 576px) {
  .discover__toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-md);
  }

  .discover__search {
    grid-column: 1 / -1;
  }

  .discover__button--clear {
    justify-self: start;
  }
}

/* Desktop: single-row toolbar */
@media (min-width: 768px) {
  .discover__toolbar {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: center;
  }

  .discover__search {
    grid-column: auto;
  }

  .discover__button--clear {
    justify-self: end;
  }
}

.discover__count {
  margin-block-end: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.discover__map {
  margin-block-end: var(--spacing-xl);
}

.discover__map h2 {
  margin-block-end: var(--spacing-md);
  font-size: var(--font-size-lg);
}

.discover__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.discover__state h2 {
  font-size: var(--font-size-lg);
}

.discover__state p {
  margin-block-start: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.discover__state--error h2 {
  color: var(--color-error);
}

.discover__state .discover__button {
  margin-top: var(--spacing-md);
}

.discover__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: var(--spacing-lg);
}

.discover__item {
  display: flex;
}

@media (min-width: 1200px) {
  .discover__grid {
    gap: var(--spacing-xl);
  }
}
</style>
