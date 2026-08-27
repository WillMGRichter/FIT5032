<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/composables/usePermissions'
import { getUsers, updateUserRole, deleteUser, getStats } from '@/services/adminService'
import { getProjects, deleteProject } from '@/services/projectService'
import { ApiError } from '@/services/api'
import EmailComposeModal from '@/components/email/EmailComposeModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const { isAdmin } = usePermissions()

const users = ref([])
const projects = ref([])
const stats = ref(null)
const isLoading = ref(true)
const error = ref(null)
const actionError = ref(null)
const actionSuccess = ref('')
const busyUserId = ref(null)
const busyProjectId = ref(null)
const showEmailModal = ref(false)

const currentUser = computed(() => authStore.state.user)

const adminCount = computed(() => users.value.filter((u) => u.role === 'admin').length)

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function loadData() {
  isLoading.value = true
  error.value = null
  actionError.value = null
  actionSuccess.value = ''
  try {
    const [userData, statsData, projectData] = await Promise.all([
      getUsers(),
      getStats(),
      getProjects(),
    ])
    users.value = userData ?? []
    projects.value = projectData ?? []
    stats.value = statsData ?? null
  } catch (err) {
    error.value = err && err.message ? err.message : 'Could not load admin data.'
  } finally {
    isLoading.value = false
  }
}

async function handleRoleChange(user, newRole) {
  if (busyUserId.value) return
  busyUserId.value = user.id
  actionError.value = null
  actionSuccess.value = ''
  try {
    const updated = await updateUserRole(user.id, newRole)
    users.value = users.value.map((u) => (u.id === updated.id ? updated : u))
    actionSuccess.value = `${updated.fullName} is now ${updated.role}.`
  } catch (err) {
    actionError.value =
      err instanceof ApiError && err.message ? err.message : 'Could not update this user.'
    await loadData()
  } finally {
    busyUserId.value = null
  }
}

async function handleDeleteUser(user) {
  if (busyUserId.value) return
  const confirmed = window.confirm(
    `Delete "${user.fullName}" (${user.email})? This cannot be undone.`,
  )
  if (!confirmed) return

  busyUserId.value = user.id
  actionError.value = null
  actionSuccess.value = ''
  try {
    await deleteUser(user.id)
    users.value = users.value.filter((u) => u.id !== user.id)
    actionSuccess.value = `${user.fullName} has been removed.`
    if (stats.value) {
      stats.value.user_count = Math.max(0, stats.value.user_count - 1)
    }
  } catch (err) {
    actionError.value =
      err instanceof ApiError && err.message ? err.message : 'Could not delete this user.'
    await loadData()
  } finally {
    busyUserId.value = null
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
    if (stats.value) {
      stats.value.project_count = Math.max(0, stats.value.project_count - 1)
    }
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
  <section class="admin" aria-labelledby="admin-heading">
    <header class="admin__header">
      <h1 id="admin-heading">Admin Dashboard</h1>
      <p class="admin__intro">Manage users, projects, roles and view platform statistics.</p>
      <nav class="admin__nav" aria-label="Admin navigation">
        <RouterLink to="/admin/users" class="admin__nav-link">User Management</RouterLink>
        <RouterLink to="/admin/projects" class="admin__nav-link">Project Management</RouterLink>
      </nav>
    </header>

    <div v-if="isLoading" class="admin__state">Loading admin data&hellip;</div>

    <div v-else-if="error" role="alert" class="admin__state admin__state--error">
      <h2>Could not load admin data</h2>
      <p>{{ error }}</p>
      <button type="button" class="admin__button" @click="loadData">Try again</button>
    </div>

    <template v-else>
      <div v-if="stats" class="admin__stats">
        <div class="admin__stat">
          <span class="admin__stat-value">{{ stats.user_count }}</span>
          <span class="admin__stat-label">Users</span>
        </div>
        <div class="admin__stat">
          <span class="admin__stat-value">{{ stats.project_count }}</span>
          <span class="admin__stat-label">Projects</span>
        </div>
        <div class="admin__stat">
          <span class="admin__stat-value">{{ stats.participation_count }}</span>
          <span class="admin__stat-label">Participations</span>
        </div>
        <div class="admin__stat">
          <span class="admin__stat-value">{{ stats.plant_count }}</span>
          <span class="admin__stat-label">Plants</span>
        </div>
      </div>

      <div v-if="actionSuccess" role="status" class="admin__banner admin__banner--success">
        {{ actionSuccess }}
      </div>
      <div v-if="actionError" role="alert" class="admin__banner admin__banner--error">
        {{ actionError }}
      </div>

      <div class="admin__section">
        <h2>Email Users</h2>
        <p class="admin__note">
          Send an email to all registered users. You can optionally attach a file.
        </p>
        <button
          type="button"
          class="admin__email-btn"
          @click="showEmailModal = true"
        >
          Compose Email
        </button>
      </div>

      <div class="admin__section">
        <h2>Registered Users</h2>
        <p class="admin__note">
          {{ users.length }} user{{ users.length === 1 ? '' : 's' }} registered.
          {{ adminCount }} admin{{ adminCount === 1 ? '' : 's' }}.
        </p>

        <div class="admin__table-wrap">
          <table class="admin__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  {{ user.fullName }}
                  <span v-if="user.id === currentUser?.id" class="admin__you">(you)</span>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <select
                    :value="user.role"
                    class="admin__role-select"
                    :disabled="user.id === currentUser?.id || busyUserId === user.id"
                    @change="handleRoleChange(user, $event.target.value)"
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{{ fmtDate(user.createdAt) }}</td>
                <td>
                  <button
                    type="button"
                    class="admin__delete-btn"
                    :disabled="user.id === currentUser?.id || busyUserId === user.id"
                    @click="handleDeleteUser(user)"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin__section">
        <h2>Projects</h2>
        <p class="admin__note">
          {{ projects.length }} project{{ projects.length === 1 ? '' : 's' }}.
        </p>

        <div v-if="projects.length === 0" class="admin__empty">No projects found.</div>

        <div v-else class="admin__table-wrap">
          <table class="admin__table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">Location</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="project in projects" :key="project.id">
                <td>
                  <RouterLink
                    :to="{ name: 'project-details', params: { id: project.id } }"
                    class="admin__project-link"
                  >
                    {{ project.title }}
                  </RouterLink>
                </td>
                <td>{{ project.category?.name ?? '—' }}</td>
                <td>
                  <span :class="['admin__status', `admin__status--${project.status}`]">
                    {{ project.status }}
                  </span>
                </td>
                <td>{{ project.location }}</td>
                <td class="admin__actions">
                  <RouterLink
                    :to="{ name: 'edit-project', params: { id: project.id } }"
                    class="admin__edit-btn"
                  >
                    Edit
                  </RouterLink>
                  <button
                    type="button"
                    class="admin__delete-btn"
                    :disabled="busyProjectId === project.id"
                    @click="handleDeleteProject(project)"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>

  <EmailComposeModal
    :visible="showEmailModal"
    :recipients="users"
    recipient-label="All registered users"
    @close="showEmailModal = false"
  />
</template>

<style scoped>
.admin {
  max-width: 960px;
  margin-inline: auto;
}

.admin__header {
  margin-block-end: var(--spacing-xl);
}

.admin__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.admin__nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.admin__nav-link {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.admin__nav-link:hover {
  background-color: var(--color-primary-dark);
}

.admin__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.admin__state--error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.admin__button {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.admin__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-xl);
}

.admin__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.admin__stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-dark);
}

.admin__stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.admin__banner {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-block-end: var(--spacing-lg);
}

.admin__banner--success {
  border: 1px solid var(--color-success);
  background-color: #e8f5e9;
  color: var(--color-success);
}

.admin__banner--error {
  border: 1px solid var(--color-error);
  background-color: #fdecea;
  color: var(--color-error);
}

.admin__section {
  margin-block-end: var(--spacing-xl);
}

.admin__section h2 {
  margin-block-end: var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.admin__note {
  margin-block-end: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.admin__table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.admin__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.admin__table th,
.admin__table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.admin__table th {
  background-color: var(--color-background);
  font-weight: var(--font-weight-semibold);
}

.admin__you {
  margin-left: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.admin__role-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  font-size: var(--font-size-sm);
}

.admin__role-select:disabled {
  opacity: 0.5;
}

.admin__delete-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.admin__delete-btn:hover:not(:disabled) {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.admin__delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.admin__empty {
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.admin__project-link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}

.admin__project-link:hover {
  text-decoration: underline;
}

.admin__status {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
}

.admin__status--active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.admin__status--planned {
  background-color: #e3f2fd;
  color: #1565c0;
}

.admin__status--completed {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.admin__status--cancelled {
  background-color: #fdecea;
  color: var(--color-error);
}

.admin__actions {
  display: flex;
  gap: var(--spacing-sm);
  white-space: nowrap;
}

.admin__edit-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  text-decoration: none;
}

.admin__edit-btn:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.admin__email-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.admin__email-btn:hover {
  background-color: var(--color-primary-dark);
}
</style>
