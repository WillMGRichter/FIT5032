<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getMyActions, updateAction, deleteAction, toggleAction } from '@/services/actionPlanService'
import DataTable from '@/components/common/DataTable.vue'
import { formatDate } from '@/utils/formatDate'

const router = useRouter()

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TITLE_MAX = 160
const DESC_MAX = 1000

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(action) {
  return !action.completed && !!action.dueDate && action.dueDate < todayStr()
}

function parseIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return value
}

function validate(form) {
  const errors = {}
  const title = typeof form.title === 'string' ? form.title.trim() : ''
  if (!title) errors.title = 'Title is required.'
  else if (title.length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer.`

  let description = typeof form.description === 'string' ? form.description.trim() : ''
  description = description === '' ? null : description
  if (description && description.length > DESC_MAX) {
    errors.description = `Description must be ${DESC_MAX} characters or fewer.`
  }

  let dueDate = null
  if (form.dueDate) {
    dueDate = parseIsoDate(form.dueDate)
    if (!dueDate) errors.dueDate = 'Date must be a real date formatted YYYY-MM-DD.'
  }

  return { errors, values: { title, description, dueDate } }
}

const actions = ref([])
const isLoading = ref(true)
const loadError = ref('')
const notice = ref('')
const errorMessage = ref('')
const statusFilter = ref('all')

const editingId = ref(null)
const edit = ref({ title: '', description: '', dueDate: '' })
const editErrors = ref({})
const isSaving = ref(false)

const total = computed(() => actions.value.length)
const completedCount = computed(() => actions.value.filter((a) => a.completed).length)
const pendingCount = computed(() => actions.value.filter((a) => !a.completed && !isOverdue(a)).length)
const overdueCount = computed(() => actions.value.filter((a) => isOverdue(a)).length)

const counts = computed(() => ({
  all: total.value,
  pending: pendingCount.value,
  completed: completedCount.value,
  overdue: overdueCount.value,
}))

const percent = computed(() => (total.value ? Math.round((completedCount.value / total.value) * 100) : 0))

const overallState = computed(() => {
  if (!total.value) return 'No actions'
  if (completedCount.value === total.value) return 'Completed'
  if (completedCount.value === 0) return 'Not started'
  return 'In progress'
})

const overallStateClass = computed(() => {
  if (overallState.value === 'Completed') return 'my-actions__progress-state--done'
  if (overallState.value === 'In progress') return 'my-actions__progress-state--in-progress'
  return 'my-actions__progress-state--none'
})

const filteredRows = computed(() => {
  const list = [...actions.value]
  if (statusFilter.value === 'all') return list
  return list.filter((a) => {
    if (statusFilter.value === 'completed') return a.completed
    if (statusFilter.value === 'pending') return !a.completed && !isOverdue(a)
    if (statusFilter.value === 'overdue') return isOverdue(a)
    return true
  })
})

function defaultSort(list) {
  return [...list].sort((a, b) => {
    const ra = statusRank(a)
    const rb = statusRank(b)
    if (ra !== rb) return ra - rb
    if (ra < 2) {
      const ad = a.dueDate ?? '9999-12-31'
      const bd = b.dueDate ?? '9999-12-31'
      return ad.localeCompare(bd)
    }
    return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
  })
}

function statusRank(a) {
  if (isOverdue(a)) return 0
  if (!a.completed) return 1
  return 2
}

const tableRows = computed(() => defaultSort(filteredRows.value))

const tableColumns = [
  { key: 'done', label: 'Done', sortable: false, searchable: false },
  { key: 'title', label: 'Action', searchable: true, sortable: true, filterPlaceholder: 'Search actions\u2026' },
  { key: 'projectTitle', label: 'Project', searchable: true, sortable: true, filterPlaceholder: 'Search project\u2026' },
  {
    key: 'dueDate',
    label: 'Due date',
    searchable: true,
    sortable: true,
    format: (val) => (val ? formatDate(val) : '\u2014'),
    sortValue: (val) => (val ? new Date(`${val}T00:00:00`).getTime() : Infinity),
    filterPlaceholder: 'Search date\u2026',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    searchable: true,
    sortValue: (_val, row) => statusRank(row),
    format: (_val, row) => statusLabel(statusOf(row)),
    searchFormat: (_val, row) => statusLabel(statusOf(row)),
    filterPlaceholder: 'Search status\u2026',
  },
  { key: '_actions', label: 'Actions', sortable: false, searchable: false },
]

function statusOf(action) {
  if (action.completed) return 'completed'
  if (isOverdue(action)) return 'overdue'
  return 'pending'
}

function statusLabel(status) {
  if (status === 'completed') return 'Completed'
  if (status === 'overdue') return 'Overdue'
  return 'Pending'
}

function statusBadgeClass(status) {
  if (status === 'completed') return 'my-actions__status--completed'
  if (status === 'overdue') return 'my-actions__status--overdue'
  return 'my-actions__status--pending'
}

function setEdit(field, value) {
  edit.value[field] = value
}

async function loadActions() {
  isLoading.value = true
  loadError.value = ''
  errorMessage.value = ''
  try {
    const data = await getMyActions()
    actions.value = Array.isArray(data) ? data : []
  } catch (err) {
    loadError.value = err?.message || 'Could not load your actions.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadActions)

function startEdit(action) {
  editingId.value = action.id
  edit.value = { title: action.title, description: action.description ?? '', dueDate: action.dueDate ?? '' }
  editErrors.value = {}
  nextTick(() => document.getElementById('my-actions-edit')?.focus())
}

async function handleSaveEdit() {
  const { errors, values } = validate(edit.value)
  editErrors.value = errors
  if (Object.keys(errors).length) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    const updated = await updateAction(editingId.value, values)
    actions.value = actions.value.map((a) => (a.id === editingId.value ? updated : a))
    notice.value = 'Action updated.'
    editingId.value = null
  } catch (err) {
    errorMessage.value = err?.message || 'Could not save changes.'
  } finally {
    isSaving.value = false
  }
}

function cancelEdit() {
  editingId.value = null
}

async function handleToggle(row) {
  try {
    const updated = await toggleAction(row.id)
    actions.value = actions.value.map((a) => (a.id === row.id ? updated : a))
    notice.value = `"${updated.title}" marked ${updated.completed ? 'complete' : 'incomplete'}.`
  } catch (err) {
    errorMessage.value = err?.message || 'Could not update the action.'
    await loadActions()
  }
}

async function handleDelete(action) {
  if (!window.confirm(`Delete \u201c${action.title}\u201d? This cannot be undone.`)) return
  try {
    await deleteAction(action.id)
    actions.value = actions.value.filter((a) => a.id !== action.id)
    notice.value = 'Action removed.'
  } catch (err) {
    errorMessage.value = err?.message || 'Could not delete the action.'
  }
}

function clearNotice() {
  notice.value = ''
}
</script>

<template>
  <section class="my-actions">
    <header class="my-actions__header">
      <div class="my-actions__header-row">
        <div>
          <h1>My Actions</h1>
          <p class="my-actions__intro">
            All the tasks you are tracking across your GreenLink projects.
          </p>
        </div>
        <button type="button" class="my-actions__discover" @click="router.push({ name: 'discover' })">
          Discover projects
        </button>
      </div>
    </header>

    <p v-if="notice" class="my-actions__notice" role="status" @click="clearNotice">
      {{ notice }} <span class="my-actions__notice-x" aria-hidden="true">&times;</span>
    </p>
    <p v-if="errorMessage" class="my-actions__error" role="alert" @click="errorMessage = ''">
      {{ errorMessage }} <span class="my-actions__error-x" aria-hidden="true">&times;</span>
    </p>

    <div v-if="isLoading" class="my-actions__state">Loading your actions&hellip;</div>

    <div v-else-if="loadError" class="my-actions__state my-actions__state--error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="my-actions__retry" @click="loadActions">Try again</button>
    </div>

    <template v-else>
      <div class="my-actions__metrics" aria-label="Action summary">
        <div class="my-actions__metric">
          <p class="my-actions__metric-value">{{ total }}</p>
          <p class="my-actions__metric-label">Total actions</p>
        </div>
        <div class="my-actions__metric">
          <p class="my-actions__metric-value">{{ pendingCount }}</p>
          <p class="my-actions__metric-label">Pending</p>
        </div>
        <div class="my-actions__metric">
          <p class="my-actions__metric-value">{{ completedCount }}</p>
          <p class="my-actions__metric-label">Completed</p>
        </div>
        <div class="my-actions__metric my-actions__metric--overdue">
          <p class="my-actions__metric-value">{{ overdueCount }}</p>
          <p class="my-actions__metric-label">Overdue</p>
        </div>
      </div>

      <div class="my-actions__progress">
        <div class="my-actions__progress-header">
          <span class="my-actions__progress-state" :class="overallStateClass">{{ overallState }}</span>
          <span class="my-actions__progress-text">
            {{ completedCount }} of {{ total }} actions completed &middot; {{ percent }}%
          </span>
        </div>
        <div
          class="my-actions__bar"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Overall progress: ${completedCount} of ${total} actions completed, ${percent} percent.`"
        >
          <div class="my-actions__bar-fill" :style="{ width: `${percent}%` }"></div>
        </div>
      </div>

      <div v-if="editingId" class="my-actions__edit-card">
        <h3>Edit action</h3>
        <form
          id="my-actions-edit"
          class="my-actions__edit-form"
          @submit.prevent="handleSaveEdit"
          aria-label="Edit action"
          tabindex="-1"
        >
          <div class="my-actions__field">
            <label for="my-actions-edit-title" class="my-actions__label">
              Action title <span class="my-actions__required" aria-hidden="true">*</span>
            </label>
            <input
              id="my-actions-edit-title"
              type="text"
              class="my-actions__input"
              :value="edit.title"
              required
              :aria-invalid="Boolean(editErrors.title)"
              aria-describedby="my-actions-edit-title-error"
              @input="setEdit('title', $event.target.value)"
            />
            <p v-if="editErrors.title" id="my-actions-edit-title-error" class="my-actions__field-error" role="alert">
              {{ editErrors.title }}
            </p>
          </div>
          <div class="my-actions__field">
            <label for="my-actions-edit-desc" class="my-actions__label">Notes (optional)</label>
            <textarea
              id="my-actions-edit-desc"
              class="my-actions__textarea"
              rows="2"
              :value="edit.description ?? ''"
              :aria-invalid="Boolean(editErrors.description)"
              aria-describedby="my-actions-edit-desc-error"
              @input="setEdit('description', $event.target.value)"
            ></textarea>
            <p v-if="editErrors.description" id="my-actions-edit-desc-error" class="my-actions__field-error" role="alert">
              {{ editErrors.description }}
            </p>
          </div>
          <div class="my-actions__field">
            <label for="my-actions-edit-due" class="my-actions__label">Due date (optional)</label>
            <input
              id="my-actions-edit-due"
              type="date"
              class="my-actions__input"
              :value="edit.dueDate ?? ''"
              :aria-invalid="Boolean(editErrors.dueDate)"
              aria-describedby="my-actions-edit-due-error"
              @input="setEdit('dueDate', $event.target.value)"
            />
            <p v-if="editErrors.dueDate" id="my-actions-edit-due-error" class="my-actions__field-error" role="alert">
              {{ editErrors.dueDate }}
            </p>
          </div>
          <div class="my-actions__form-actions">
            <button type="submit" class="my-actions__save" :disabled="isSaving">
              {{ isSaving ? 'Saving\u2026' : 'Save changes' }}
            </button>
            <button type="button" class="my-actions__cancel" :disabled="isSaving" @click="cancelEdit">Cancel</button>
          </div>
        </form>
      </div>

      <div class="my-actions__filters" role="group" aria-label="Filter actions by status">
        <button
          v-for="filter in ['all', 'pending', 'completed', 'overdue']"
          :key="filter"
          type="button"
          class="my-actions__filter-btn"
          :class="{ 'my-actions__filter-btn--active': statusFilter === filter }"
          :aria-pressed="statusFilter === filter"
          @click="statusFilter = filter"
        >
          {{ filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : filter === 'completed' ? 'Completed' : 'Overdue' }}
          ({{ counts[filter] }})
        </button>
      </div>

      <div v-if="actions.length === 0" class="my-actions__empty">
        <p>You have no actions yet. Open a project you have joined and add your first action.</p>
        <button type="button" class="my-actions__discover" @click="router.push({ name: 'discover' })">
          Discover projects
        </button>
      </div>

      <DataTable
        v-else
        :rows="tableRows"
        :columns="tableColumns"
        row-key="id"
        empty-message="No actions match the current filters."
        caption="Personal project actions"
        export-base-name="greenlink-my-actions"
        export-title="GreenLink My Actions"
      >
        <template #cell-done="{ row }">
          <input
            type="checkbox"
            class="my-actions__check"
            :checked="row.completed"
            :aria-label="`Mark \u201c${row.title}\u201d as ${row.completed ? 'incomplete' : 'complete'}`"
            @change="handleToggle(row)"
          />
        </template>
        <template #cell-title="{ row }">
          <div class="my-actions__title-group">
            <span class="my-actions__title" :class="{ 'my-actions__title--done': row.completed }">
              {{ row.title }}
            </span>
            <span v-if="row.isSuggested" class="my-actions__badge my-actions__badge--suggested">Suggested</span>
          </div>
          <p v-if="row.description" class="my-actions__desc">{{ row.description }}</p>
          <p class="my-actions__due">Due {{ row.dueDate ? formatDate(row.dueDate) : 'No due date' }}</p>
        </template>
        <template #cell-status="{ row }">
          <span class="my-actions__badge" :class="statusBadgeClass(statusOf(row))">
            {{ statusLabel(statusOf(row)) }}
          </span>
        </template>
        <template #cell-_actions="{ row }">
          <div class="my-actions__table-actions">
            <button type="button" class="my-actions__btn" @click="startEdit(row)">Edit</button>
            <button type="button" class="my-actions__btn my-actions__btn--danger" @click="handleDelete(row)">Delete</button>
          </div>
        </template>
      </DataTable>
    </template>
  </section>
</template>

<style scoped>
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

.my-actions {
  max-width: var(--container-max-width);
  margin-inline: auto;
}

.my-actions__header {
  margin-block-end: var(--spacing-lg);
}

.my-actions__header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.my-actions__header h1 {
  margin: 0;
}

.my-actions__intro {
  margin-top: var(--spacing-xs);
  color: var(--color-text-secondary);
}

.my-actions__discover {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.my-actions__discover:hover {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.my-actions__notice {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-block-end: var(--spacing-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: #f0f7f0;
  color: var(--color-primary-dark);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.my-actions__notice-x,
.my-actions__error-x {
  margin-inline-start: var(--spacing-sm);
  font-weight: var(--font-weight-bold);
}

.my-actions__error {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-block-end: var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.my-actions__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
  color: var(--color-text-secondary);
}

.my-actions__state--error h2 {
  color: var(--color-error);
}

.my-actions__retry {
  margin-block-start: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.my-actions__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-lg);
}

.my-actions__metric {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
}

.my-actions__metric-value {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-dark);
}

.my-actions__metric-label {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}

.my-actions__metric--overdue .my-actions__metric-value {
  color: var(--color-error);
}

.my-actions__progress {
  margin-block-end: var(--spacing-lg);
}

.my-actions__progress-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-sm);
  margin-block-end: var(--spacing-sm);
}

.my-actions__progress-state {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.my-actions__progress-state--done {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.my-actions__progress-state--in-progress {
  background-color: #e8f5e9;
  color: var(--color-primary-dark);
}

.my-actions__progress-state--none {
  background-color: var(--color-border);
  color: var(--color-text-secondary);
}

.my-actions__progress-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.my-actions__bar {
  height: 10px;
  border-radius: var(--radius-sm);
  background-color: var(--color-border);
  overflow: hidden;
}

.my-actions__bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-light);
  transition: width 0.3s ease;
}

.my-actions__edit-card {
  padding: var(--spacing-lg);
  margin-block-end: var(--spacing-lg);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-lg);
  background-color: #f0f7f0;
}

.my-actions__edit-card h3 {
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-md);
}

.my-actions__edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.my-actions__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.my-actions__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.my-actions__required {
  color: var(--color-error);
}

.my-actions__input,
.my-actions__textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
}

.my-actions__textarea {
  resize: vertical;
}

.my-actions__input[aria-invalid='true'],
.my-actions__textarea[aria-invalid='true'] {
  border-color: var(--color-error);
}

.my-actions__field-error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.my-actions__form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.my-actions__save {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.my-actions__save:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.my-actions__save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.my-actions__cancel {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
}

.my-actions__cancel:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.my-actions__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-block-end: var(--spacing-lg);
}

.my-actions__filter-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.my-actions__filter-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.my-actions__filter-btn--active {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.my-actions__filter-btn--active:hover {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.my-actions__empty {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
}

.my-actions__empty p {
  margin: 0 0 var(--spacing-md);
  color: var(--color-text-secondary);
}

.my-actions__check {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.my-actions__title-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
}

.my-actions__title {
  font-weight: var(--font-weight-semibold);
  word-break: break-word;
}

.my-actions__title--done {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.my-actions__badge {
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.my-actions__badge--suggested {
  background-color: #e3f2fd;
  color: #1565c0;
}

.my-actions__status--completed {
  background-color: #e8f5e9;
  color: var(--color-primary-dark);
}

.my-actions__status--pending {
  background-color: var(--color-background);
  color: var(--color-text-secondary);
}

.my-actions__status--overdue {
  background-color: #fdecea;
  color: var(--color-error);
}

.my-actions__desc {
  margin: var(--spacing-xs) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.my-actions__due {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.my-actions__table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.my-actions__btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  cursor: pointer;
}

.my-actions__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.my-actions__btn--danger {
  border-color: var(--color-error);
  color: var(--color-error);
}

.my-actions__btn--danger:hover {
  background-color: var(--color-error);
  color: var(--color-surface);
}

@media (max-width: 575px) {
  .my-actions__metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>