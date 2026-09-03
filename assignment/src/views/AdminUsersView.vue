<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/composables/usePermissions'
import { getUsers, updateUserRole, deleteUser } from '@/services/adminService'
import { ApiError } from '@/services/api'
import DataTable from '@/components/common/DataTable.vue'

const router = useRouter()
const authStore = useAuthStore()
const { isAdmin } = usePermissions()

const users = ref([])
const isLoading = ref(true)
const error = ref(null)
const actionError = ref(null)
const actionSuccess = ref('')
const busyUserId = ref(null)

const currentUser = computed(() => authStore.state.user)

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function roleCellClass(value) {
  return value === 'admin' ? 'badge badge--admin' : 'badge badge--member'
}

const columns = [
  {
    key: 'fullName',
    label: 'Name',
    searchable: true,
    sortable: true,
    filterPlaceholder: 'Search name\u2026',
  },
  {
    key: 'email',
    label: 'Email',
    searchable: true,
    sortable: true,
    filterPlaceholder: 'Search email\u2026',
  },
  {
    key: 'role',
    label: 'Role',
    searchable: true,
    sortable: true,
    cellClass: roleCellClass,
    filterPlaceholder: 'Search role\u2026',
  },
  {
    key: 'createdAt',
    label: 'Created Date',
    sortable: true,
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
    const data = await getUsers()
    users.value = data ?? []
  } catch (err) {
    error.value = err && err.message ? err.message : 'Could not load users.'
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
  } catch (err) {
    actionError.value =
      err instanceof ApiError && err.message ? err.message : 'Could not delete this user.'
    await loadData()
  } finally {
    busyUserId.value = null
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
  <section class="admin-users" aria-labelledby="admin-users-heading">
    <header class="admin-users__header">
      <div class="admin-users__header-row">
        <div>
          <h1 id="admin-users-heading">User Management</h1>
          <p class="admin-users__intro">Search, sort, filter and manage registered users.</p>
        </div>
        <RouterLink to="/admin" class="admin-users__back">Back to Dashboard</RouterLink>
      </div>
    </header>

    <div v-if="isLoading" class="admin-users__state">Loading users&hellip;</div>

    <div v-else-if="error" role="alert" class="admin-users__state admin-users__state--error">
      <h2>Could not load users</h2>
      <p>{{ error }}</p>
      <button type="button" class="admin-users__button" @click="loadData">Try again</button>
    </div>

    <template v-else>
      <div v-if="actionSuccess" role="status" class="admin-users__banner admin-users__banner--success">
        {{ actionSuccess }}
      </div>
      <div v-if="actionError" role="alert" class="admin-users__banner admin-users__banner--error">
        {{ actionError }}
      </div>

      <DataTable
        :rows="users"
        :columns="columns"
        row-key="id"
        empty-message="No users match your search."
        caption="Registered users"
        export-base-name="greenlink-users"
        export-title="GreenLink Registered Users"
      >
        <template #cell-_actions="{ row }">
          <div class="admin-users__actions">
            <select
              :value="row.role"
              class="admin-users__role-select"
              :disabled="row.id === currentUser?.id || busyUserId === row.id"
              :aria-label="`Change role for ${row.fullName}`"
              @change="handleRoleChange(row, $event.target.value)"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button
              type="button"
              class="admin-users__delete-btn"
              :disabled="row.id === currentUser?.id || busyUserId === row.id"
              :aria-label="`Delete ${row.fullName}`"
              @click="handleDeleteUser(row)"
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
.admin-users {
  max-width: 1100px;
  margin-inline: auto;
  padding-inline: var(--spacing-md);
}

.admin-users__header {
  margin-block-end: var(--spacing-xl);
}

.admin-users__header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.admin-users__intro {
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.admin-users__back {
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

.admin-users__back:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.admin-users__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.admin-users__state--error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.admin-users__button {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.admin-users__banner {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-block-end: var(--spacing-lg);
}

.admin-users__banner--success {
  border: 1px solid var(--color-success);
  background-color: #e8f5e9;
  color: var(--color-success);
}

.admin-users__banner--error {
  border: 1px solid var(--color-error);
  background-color: #fdecea;
  color: var(--color-error);
}

.admin-users__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  white-space: nowrap;
}

.admin-users__role-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  font-size: var(--font-size-sm);
}

.admin-users__role-select:disabled {
  opacity: 0.5;
}

.admin-users__delete-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.admin-users__delete-btn:hover:not(:disabled) {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.admin-users__delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
}

.badge--admin {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.badge--member {
  background-color: #e3f2fd;
  color: #1565c0;
}
</style>
