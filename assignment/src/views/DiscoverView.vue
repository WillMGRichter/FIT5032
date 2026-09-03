<script setup>
import { computed, onMounted, ref } from 'vue'
import ProjectCard from '@/components/project/ProjectCard.vue'
import ProjectMap from '@/components/common/ProjectMap.vue'
import { getProjects } from '@/services/projectService'
import { getCategories } from '@/services/categoryService'
import { useProjectFilters, SORT_OPTIONS } from '@/composables/useProjectFilters'
import { exportCSV, exportPDF, dateStamp } from '@/services/exportService'

const projects = ref([])
const categories = ref([])
const isLoading = ref(true)
const error = ref(null)
const selectedProjectId = ref(null)
const showMap = ref(false)

const exportBusy = ref(false)
const exportMessage = ref('')

const exportColumns = [
  { key: 'title', label: 'Project' },
  { key: 'category.name', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
  {
    key: 'volunteerCount',
    label: 'Participants',
    format: (val) => (val != null ? String(val) : '0'),
  },
  {
    key: 'avgRating',
    label: 'Rating',
    format: (val) => {
      if (val === 0 || val == null) return 'No ratings'
      return `${Number(val).toFixed(1)} / 5`
    },
  },
  {
    key: 'startDate',
    label: 'Start Date',
    format: (val) => (val ? new Date(val).toLocaleDateString('en-AU') : ''),
  },
]

async function handleExportCsv() {
  if (exportBusy.value || sortedProjects.value.length === 0) return
  exportBusy.value = true
  exportMessage.value = ''
  try {
    await exportCSV({
      filename: `greenlink-projects-${dateStamp()}.csv`,
      columns: exportColumns,
      rows: sortedProjects.value,
    })
    exportMessage.value = `Exported ${sortedProjects.value.length} project${sortedProjects.value.length === 1 ? '' : 's'} to CSV.`
  } catch {
    exportMessage.value = 'Could not export CSV.'
  } finally {
    exportBusy.value = false
  }
}

async function handleExportPdf() {
  if (exportBusy.value || sortedProjects.value.length === 0) return
  exportBusy.value = true
  exportMessage.value = ''
  try {
    await exportPDF({
      filename: `greenlink-projects-${dateStamp()}.pdf`,
      title: 'GreenLink Projects',
      subtitle: `Generated ${new Date().toLocaleDateString('en-AU')} \u2022 ${sortedProjects.value.length} project${sortedProjects.value.length === 1 ? '' : 's'}`,
      columns: exportColumns,
      rows: sortedProjects.value,
    })
    exportMessage.value = `Exported ${sortedProjects.value.length} project${sortedProjects.value.length === 1 ? '' : 's'} to PDF.`
  } catch {
    exportMessage.value = 'Could not export PDF.'
  } finally {
    exportBusy.value = false
  }
}

const {
  searchQuery,
  selectedCategory,
  selectedStatus,
  sortBy,
  currentPage,
  totalPages,
  filteredProjects,
  sortedProjects,
  paginatedProjects,
  hasActiveFilters,
  clearFilters,
} = useProjectFilters(projects)

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
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

function handleSelectProject(id) {
  selectedProjectId.value = selectedProjectId.value === id ? null : id
}

function handleMapSelect(id) {
  selectedProjectId.value = id
  const card = document.querySelector(`[data-project-id="${id}"]`)
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

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
        <select v-model="sortBy" class="discover__input" aria-label="Sort by">
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
            Sort: {{ option.label }}
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

      <div class="discover__results-bar">
        <p class="discover__count" role="status">
          Showing {{ paginatedProjects.length }} of {{ filteredProjects.length }} projects
          <template v-if="filteredProjects.length !== projects.length">
            ({{ projects.length }} total)
          </template>
        </p>
        <div class="discover__results-actions">
          <div class="discover__export" aria-label="Export projects">
            <button
              type="button"
              class="discover__export-btn"
              :disabled="exportBusy || sortedProjects.length === 0"
              @click="handleExportCsv"
            >
              {{ exportBusy ? 'Working\u2026' : 'Export CSV' }}
            </button>
            <button
              type="button"
              class="discover__export-btn discover__export-btn--pdf"
              :disabled="exportBusy || sortedProjects.length === 0"
              @click="handleExportPdf"
            >
              {{ exportBusy ? 'Working\u2026' : 'Export PDF' }}
            </button>
          </div>
          <button
            type="button"
            class="discover__map-toggle"
            :class="{ 'discover__map-toggle--active': showMap }"
            @click="showMap = !showMap"
          >
            {{ showMap ? 'Hide map' : 'Show map' }}
          </button>
        </div>
      </div>

      <p
        v-if="exportMessage"
        role="status"
        class="discover__export-message"
        :class="{ 'discover__export-message--error': exportMessage.startsWith('Could not') }"
      >
        {{ exportMessage }}
      </p>

      <section v-show="showMap" class="discover__map" aria-labelledby="discover-map-heading">
        <h2 id="discover-map-heading" class="sr-only">Explore on the map</h2>
        <ProjectMap
          :projects="sortedProjects"
          :selected-project-id="selectedProjectId"
          :is-loading="isLoading"
          @select="handleMapSelect"
        />
      </section>

      <ul v-if="filteredProjects.length > 0" class="discover__grid">
        <li
          v-for="project in paginatedProjects"
          :key="project.id"
          :data-project-id="project.id"
          class="discover__item"
        >
          <ProjectCard
            :project="project"
            :is-selected="selectedProjectId === project.id"
            @select="handleSelectProject"
          />
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

      <nav v-if="totalPages > 1" class="discover__pagination" aria-label="Project results pages">
        <button
          type="button"
          class="discover__page-btn"
          :disabled="currentPage <= 1"
          aria-label="Previous page"
          @click="currentPage--"
        >
          &laquo; Prev
        </button>
        <template v-for="(page, idx) in pageNumbers" :key="idx">
          <span v-if="page === '...'" class="discover__page-ellipsis" aria-hidden="true">&hellip;</span>
          <button
            v-else
            type="button"
            class="discover__page-btn"
            :class="{ 'discover__page-btn--active': page === currentPage }"
            :aria-current="page === currentPage ? 'page' : undefined"
            :aria-label="`Page ${page}`"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
        </template>
        <button
          type="button"
          class="discover__page-btn"
          :disabled="currentPage >= totalPages"
          aria-label="Next page"
          @click="currentPage++"
        >
          Next &raquo;
        </button>
      </nav>
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

.discover__results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-block-end: var(--spacing-md);
}

.discover__count {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.discover__results-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.discover__export {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.discover__export-btn {
  min-height: 40px;
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.discover__export-btn--pdf {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.discover__export-btn:hover:not(:disabled) {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.discover__export-btn--pdf:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.discover__export-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.discover__export-message {
  margin-block-end: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.discover__export-message--error {
  color: var(--color-error);
}

.discover__map-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.discover__map-toggle--active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.discover__map {
  margin-block-end: var(--spacing-xl);
}

.discover__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: var(--spacing-lg);
}

.discover__item {
  display: flex;
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

.discover__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-block-start: var(--spacing-xl);
}

.discover__page-btn {
  min-width: 40px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.discover__page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.discover__page-btn--active {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.discover__page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.discover__page-ellipsis {
  padding: 0 var(--spacing-xs);
  color: var(--color-text-secondary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

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

@media (min-width: 768px) {
  .discover__toolbar {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: center;
  }

  .discover__search {
    grid-column: auto;
  }

  .discover__button--clear {
    justify-self: end;
  }
}

@media (min-width: 1200px) {
  .discover__grid {
    gap: var(--spacing-xl);
  }
}
</style>
