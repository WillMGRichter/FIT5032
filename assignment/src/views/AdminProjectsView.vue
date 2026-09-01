<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissions } from '@/composables/usePermissions'
import { getProjects, deleteProject } from '@/services/projectService'
import { ApiError } from '@/services/api'
import DataTable from '@/components/common/DataTable.vue'

const router = useRouter()
const { isAdmin } = usePermissions()

const projects = ref([])
const isLoading = ref(true)
const error = ref(null)
const actionError = ref(null)
const actionSuccess = ref('')
const busyProjectId = ref(null)

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function fmtRating(value) {
  if (value === 0 || value == null) return 'No ratings'
  return `${Number(value).toFixed(1)} / 5`
}

function statusCellClass(value) {
  return `badge badge--${value}`
}

const columns = [
  {
    key: 'title',
    label: 'Project',
    searchable: true,
    sortable: true,
    filterPlaceholder: 'Search project\u2026',
  },
  {
    key: 'category.name',
    label: 'Category',
    searchable: true,
    sortable: true,
    filterPlaceholder: 'Search category\u2026',
  },
  {
    key: 'location',
    label: 'Location',
    searchable: true,
    sortable: true,
    filterPlaceholder: 'Search location\u2026',
  },
  {
    key: 'status',
    label: 'Status',
    searchable: true,
    sortable: true,
    cellClass: statusCellClass,
    filterPlaceholder: 'Search status\u2026',
  },
  {
    key: 'volunteerCount',
    label: 'Participants',
    sortable: true,
    searchable: false,
    format: (val) => (val != null ? String(val) : '0'),
    sortValue: (val) => (val != null ? Number(val) : 0),
  },
  {
    key: 'avgRating',
    label: 'Rating',
    sortable: true,
    searchable: false,
    format: (val) => fmtRating(val),
    sortValue: (val) => (val != null ? Number(val) : 0),
  },
  {
    key: 'startDate',
    label: 'Start Date',
    sortable: true,
    searchable: false,
    format: (val) => fmtDate(val),
    sortValue: (val) => (val ? new Date(val).getTime() : 0),
  },
  {
    key: '_actions',
    label: 'Actions',
    sortable: false,
    searchable: false,
  },
]

async function loadData() {
  isLoading.value = true
  error.value = null
  actionError.value = null
  actionSuccess.value = ''
  try {
    const data = await getProjects()
    projects.value = data ?? []
  } catch (err) {
    error.value = err && err.message ? err.message : 'Could not load projects.'
  } finally {
    isLoading.value = false
  }
}

async function handleDeleteProject(project) {
  if (busyProjectId.value) return
  const confirmed = window.confirm(`Delete "${project.title}"? This cannot be undone.`)
  if (!confirmed) return

  busyProjectId.value = project.id
  actionError.value = null
  actionSuccess.value = ''
  try {
    await deleteProject(project.id)
    projects.value = projects.value.filter((p) => p.id !== project.id)
    actionSuccess.value = `"${project.title}" has been removed.`
  } catch (err) {
    actionError.value =
      err instanceof ApiError && err.message ? err.message : 'Could not delete this project.'
    await loadData()
  } finally {
    busyProjectId.value = null
  }
}

onMounted(() => {
  if (!isAdmin.value) {
    router.replace({ name: 'unauthorized' })
    return
  }
  loadData()
})
</script>

<template>
  <section class="admin-projects" aria-labelledby="admin-projects-heading">
    <header class="admin-projects__header">
      <div class="admin-projects__header-row">
        <div>
          <h1 id="admin-projects-heading">Project Management</h1>
          <p class="admin-projects__intro">Search, sort, filter and manage projects.</p>
        </div>
        <RouterLink to="/admin" class="admin-projects__back">Back to Dashboard</RouterLink>
      </div>
    </header>

    <div v-if="isLoading" class="admin-projects__state">Loading projects&hellip;</div>

    <div v-else-if="error" role="alert" class="admin-projects__state admin-projects__state--error">
      <h2>Could not load projects</h2>
      <p>{{ error }}</p>
      <button type="button" class="admin-projects__button" @click="loadData">Try again</button>
    </div>

    <template v-else>
      <div v-if="actionSuccess" role="status" class="admin-projects__banner admin-projects__banner--success">
        {{ actionSuccess }}
      </div>
      <div v-if="actionError" role="alert" class="admin-projects__banner admin-projects__banner--error">
        {{ actionError }}
      </div>

      <DataTable
        :rows="projects"
        :columns="columns"
        row-key="id"
        empty-message="No projects match your search."
        caption="All projects"
        export-base-name="greenlink-projects"
        export-title="GreenLink Projects"
      >
        <template #cell-title="{ row }">
          <RouterLink
            :to="{ name: 'project-details', params: { id: row.id } }"
            class="admin-projects__project-link"
          >
            {{ row.title }}
          </RouterLink>
        </template>
        <template #cell-_actions="{ row }">
          <div class="admin-projects__actions">
            <RouterLink
              :to="{ name: 'edit-project', params: { id: row.id } }"
              class="admin-projects__edit-btn"
            >
              Edit
            </RouterLink>
            <button
              type="button"
              class="admin-projects__delete-btn"
              :disabled="busyProjectId === row.id"
              :aria-label="`Delete ${row.title}`"
              @click="handleDeleteProject(row)"
            >
              Delete
            </button>
          </div>
        </template>
      </DataTable>
    </template>
  </section>
</template>

<style scoped>
.admin-projects {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--spacing-md);
}

.admin-projects__header {
  margin-block-end: var(--spacing-xl);
}

.admin-projects__header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.admin-projects__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.admin-projects__back {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  white-space: nowrap;
}

.admin-projects__back:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.admin-projects__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.admin-projects__state--error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.admin-projects__button {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.admin-projects__banner {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-block-end: var(--spacing-lg);
}

.admin-projects__banner--success {
  border: 1px solid var(--color-success);
  background-color: #e8f5e9;
  color: var(--color-success);
}

.admin-projects__banner--error {
  border: 1px solid var(--color-error);
  background-color: #fdecea;
  color: var(--color-error);
}

.admin-projects__actions {
  display: flex;
  gap: var(--spacing-sm);
  white-space: nowrap;
}

.admin-projects__edit-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}

.admin-projects__edit-btn:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.admin-projects__delete-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.admin-projects__delete-btn:hover:not(:disabled) {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.admin-projects__delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.admin-projects__project-link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.admin-projects__project-link:hover {
  text-decoration: underline;
}

.badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
}

.badge--active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.badge--planned {
  background-color: #e3f2fd;
  color: #1565c0;
}

.badge--completed {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.badge--cancelled {
  background-color: #fdecea;
  color: var(--color-error);
}
</style>
