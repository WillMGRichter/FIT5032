<script setup>
import { reactive, ref, computed, onMounted, nextTick } from 'vue'
import { formatDate } from '@/utils/formatDate'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import {
  getProjectActions,
  createAction,
  generateSuggestions,
  updateAction,
  toggleAction,
  deleteAction,
} from '@/services/actionPlanService'
import { getSuggestedActionsForProject } from '@/services/actionSuggestionService'

const props = defineProps({
  projectId: { type: [String, Number], required: true },
  categoryId: { type: String, default: '' },
  categoryName: { type: String, default: '' },
  projectTitle: { type: String, default: '' },
  startDate: { type: String, default: '' },
})

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
    if (!dueDate) errors.dueDate = 'Due date must be a real date formatted YYYY-MM-DD.'
  }

  return { errors, values: { title, description, dueDate } }
}

const actions = ref([])
const isLoading = ref(true)
const loadError = ref('')
const notice = ref('')
const actionError = ref('')
const showAdd = ref(false)
const add = reactive({ title: '', description: '', dueDate: '' })
const addErrors = ref({})
const isAdding = ref(false)
const editingId = ref(null)
const edit = reactive({ title: '', description: '', dueDate: '' })
const editErrors = ref({})
const isSaving = ref(false)

const completedCount = computed(() => actions.value.filter((a) => a.completed).length)
const totalCount = computed(() => actions.value.length)
const percent = computed(() => (totalCount.value ? Math.round((completedCount.value / totalCount.value) * 100) : 0))
const overdueCount = computed(() => actions.value.filter((a) => isOverdue(a)).length)

const stateLabel = computed(() => {
  if (!totalCount.value) return 'No actions'
  if (completedCount.value === totalCount.value) return 'Completed'
  if (completedCount.value === 0) return 'Not started'
  return 'In progress'
})

const stateClass = computed(() => {
  if (stateLabel.value === 'Completed') return 'action-tracker__progress-state--done'
  if (stateLabel.value === 'In progress') return 'action-tracker__progress-state--in-progress'
  return 'action-tracker__progress-state--none'
})

const displayActions = computed(() => {
  return [...actions.value].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (!a.completed) {
      const aOver = isOverdue(a)
      const bOver = isOverdue(b)
      if (aOver !== bOver) return aOver ? -1 : 1
      const ad = a.dueDate ?? '9999-12-31'
      const bd = b.dueDate ?? '9999-12-31'
      return ad.localeCompare(bd)
    }
    return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
  })
})

function setNotice(msg) {
  notice.value = msg
}

function setAdd(field, value) {
  add[field] = value
}
function setEdit(field, value) {
  edit[field] = value
}

async function loadActions() {
  isLoading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    const data = await getProjectActions(props.projectId)
    actions.value = Array.isArray(data) ? data : []
  } catch (err) {
    loadError.value = err?.message || 'Could not load your action plan.'
  } finally {
    isLoading.value = false
  }
}

async function applySuggestions() {
  const templates = getSuggestedActionsForProject({
    id: props.projectId,
    categoryId: props.categoryId,
    categoryName: props.categoryName,
    startDate: props.startDate,
  })
  if (!templates.length) return
  try {
    const result = await generateSuggestions(props.projectId, templates)
    if (result?.generated && Array.isArray(result.actions)) {
      actions.value = [...actions.value, ...result.actions]
      setNotice('Suggested actions were added. You can tick them off, edit or remove any you do not need.')
    }
  } catch {
    /* silent — user can still add their own actions */
  }
}

onMounted(async () => {
  await loadActions()
  if (!actions.value.some((a) => a.isSuggested)) {
    await applySuggestions()
  }
})

async function handleAdd() {
  const { errors, values } = validate(add)
  addErrors.value = errors
  if (Object.keys(errors).length) return
  isAdding.value = true
  actionError.value = ''
  try {
    const action = await createAction({ projectId: Number(props.projectId), ...values })
    actions.value = [...actions.value, action]
    add.title = ''
    add.description = ''
    add.dueDate = ''
    showAdd.value = false
    addErrors.value = {}
    setNotice('Action added.')
    await nextTick()
    document.getElementById(`action-${action.id}`)?.focus()
  } catch (err) {
    actionError.value = err?.message || 'Could not add the action.'
  } finally {
    isAdding.value = false
  }
}

function startEdit(action) {
  editingId.value = action.id
  edit.title = action.title
  edit.description = action.description ?? ''
  edit.dueDate = action.dueDate ?? ''
  editErrors.value = {}
}

async function handleSaveEdit() {
  const { errors, values } = validate(edit)
  editErrors.value = errors
  if (Object.keys(errors).length) return
  isSaving.value = true
  actionError.value = ''
  try {
    const updated = await updateAction(editingId.value, values)
    actions.value = actions.value.map((a) => (a.id === editingId.value ? updated : a))
    notice.value = 'Action updated.'
    editingId.value = null
  } catch (err) {
    actionError.value = err?.message || 'Could not save changes.'
  } finally {
    isSaving.value = false
  }
}

function cancelEdit() {
  editingId.value = null
}

async function handleToggle(action) {
  try {
    const updated = await toggleAction(action.id)
    actions.value = actions.value.map((a) => (a.id === action.id ? updated : a))
    setNotice(`"${updated.title}" marked ${updated.completed ? 'complete' : 'incomplete'}.`)
  } catch (err) {
    actionError.value = err?.message || 'Could not update the action.'
    await loadActions()
  }
}

async function handleDelete(action) {
  if (!window.confirm(`Delete \u201c${action.title}\u201d? This cannot be undone.`)) return
  try {
    await deleteAction(action.id)
    actions.value = actions.value.filter((a) => a.id !== action.id)
    setNotice('Action removed.')
  } catch (err) {
    actionError.value = err?.message || 'Could not delete the action.'
  }
}
</script>

<template>
  <section class="action-tracker" aria-labelledby="at-heading">
    <header class="action-tracker__header">
      <h3 id="at-heading">My Action Plan</h3>
      <p class="action-tracker__subtitle">
        Track the tasks you need to complete for this project.
      </p>
    </header>

    <p v-if="notice" class="action-tracker__notice" role="status">{{ notice }}</p>
    <p v-if="actionError" class="action-tracker__error" role="alert">{{ actionError }}</p>

    <div v-if="isLoading" class="action-tracker__state">Loading your action plan&hellip;</div>

    <div v-else-if="loadError" class="action-tracker__state action-tracker__state--error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="action-tracker__retry" @click="loadActions">Try again</button>
    </div>

    <template v-else>
      <div class="action-tracker__progress">
        <div class="action-tracker__progress-header">
          <span class="action-tracker__progress-state" :class="stateClass">{{ stateLabel }}</span>
          <span class="action-tracker__progress-text">
            {{ completedCount }} of {{ totalCount }} actions completed &middot; {{ percent }}%
          </span>
          <span v-if="overdueCount" class="action-tracker__overdue-note">
            &middot; {{ overdueCount }} overdue
          </span>
        </div>
        <div
          class="action-tracker__bar"
          role="progressbar"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Progress: ${completedCount} of ${totalCount} actions completed, ${percent} percent.`"
        >
          <div class="action-tracker__bar-fill" :style="{ width: `${percent}%` }"></div>
        </div>
      </div>

      <ul v-if="displayActions.length" class="action-tracker__list">
        <li
          v-for="action in displayActions"
          :key="action.id"
          :id="`action-${action.id}`"
          class="action-tracker__item"
          :class="{ 'action-tracker__item--completed': action.completed }"
          tabindex="-1"
        >
          <form
            v-if="editingId === action.id"
            class="action-tracker__edit-form"
            @submit.prevent="handleSaveEdit"
            aria-label="Edit action"
          >
            <FormInput
              id="at-edit-title"
              :model-value="edit.title"
              label="Action title"
              required
              :error="editErrors.title ?? ''"
              @update:model-value="setEdit('title', $event)"
            />
            <FormTextarea
              id="at-edit-desc"
              :model-value="edit.description ?? ''"
              label="Notes (optional)"
              :rows="2"
              :error="editErrors.description ?? ''"
              @update:model-value="setEdit('description', $event)"
            />
            <label class="action-tracker__date-field" for="at-edit-due">
              <span class="action-tracker__label">Due date (optional)</span>
              <input
                id="at-edit-due"
                type="date"
                class="action-tracker__date"
                :value="edit.dueDate ?? ''"
                :aria-invalid="Boolean(editErrors.dueDate)"
                aria-describedby="at-edit-due-error"
                @input="setEdit('dueDate', $event.target.value)"
              />
              <p
                v-if="editErrors.dueDate"
                id="at-edit-due-error"
                class="action-tracker__field-error"
                role="alert"
              >
                {{ editErrors.dueDate }}
              </p>
            </label>
            <div class="action-tracker__form-actions">
              <button type="submit" class="action-tracker__save" :disabled="isSaving">
                {{ isSaving ? 'Saving\u2026' : 'Save changes' }}
              </button>
              <button type="button" class="action-tracker__cancel" :disabled="isSaving" @click="cancelEdit">
                Cancel
              </button>
            </div>
          </form>

          <div v-else class="action-tracker__row">
            <input
              type="checkbox"
              :checked="action.completed"
              class="action-tracker__check"
              :aria-label="`Mark \u201c${action.title}\u201d as ${action.completed ? 'incomplete' : 'complete'}`"
              @change="handleToggle(action)"
            />
            <div class="action-tracker__body">
              <div class="action-tracker__title-line">
                <span class="action-tracker__title" :class="{ 'action-tracker__title--done': action.completed }">
                  {{ action.title }}
                </span>
                <span v-if="action.isSuggested" class="action-tracker__badge action-tracker__badge--suggested">
                  Suggested
                </span>
                <span v-if="isOverdue(action)" class="action-tracker__badge action-tracker__badge--overdue">
                  Overdue
                </span>
              </div>
              <p v-if="action.description" class="action-tracker__description">
                {{ action.description }}
              </p>
              <p class="action-tracker__due">
                Due {{ action.dueDate ? formatDate(action.dueDate) : 'No due date set' }}
              </p>
            </div>
            <div class="action-tracker__controls">
              <button type="button" class="action-tracker__btn" @click="startEdit(action)">Edit</button>
              <button type="button" class="action-tracker__btn action-tracker__btn--danger" @click="handleDelete(action)">
                Delete
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="action-tracker__empty">No actions yet for this project.</p>

      <div class="action-tracker__add">
        <button
          v-if="!showAdd"
          type="button"
          class="action-tracker__add-toggle"
          @click="showAdd = true"
        >
          + Add Action
        </button>
        <form
          v-else
          class="action-tracker__add-form"
          @submit.prevent="handleAdd"
          aria-label="Add new action"
        >
          <FormInput
            id="at-add-title"
            :model-value="add.title"
            label="Action title"
            required
            placeholder="e.g. Pack gardening gloves"
            :error="addErrors.title ?? ''"
            @update:model-value="setAdd('title', $event)"
          />
          <FormTextarea
            id="at-add-desc"
            :model-value="add.description ?? ''"
            label="Notes (optional)"
            placeholder="Any extra detail"
            :rows="2"
            :error="addErrors.description ?? ''"
            @update:model-value="setAdd('description', $event)"
          />
          <label class="action-tracker__date-field" for="at-add-due">
            <span class="action-tracker__label">Due date (optional)</span>
            <input
              id="at-add-due"
              type="date"
              class="action-tracker__date"
              :value="add.dueDate ?? ''"
              :aria-invalid="Boolean(addErrors.dueDate)"
              aria-describedby="at-add-due-error"
              @input="setAdd('dueDate', $event.target.value)"
            />
            <p
              v-if="addErrors.dueDate"
              id="at-add-due-error"
              class="action-tracker__field-error"
              role="alert"
            >
              {{ addErrors.dueDate }}
            </p>
          </label>
          <div class="action-tracker__form-actions">
            <button type="submit" class="action-tracker__save" :disabled="isAdding">
              {{ isAdding ? 'Adding\u2026' : 'Add action' }}
            </button>
            <button type="button" class="action-tracker__cancel" :disabled="isAdding" @click="showAdd = false">
              Cancel
            </button>
          </div>
        </form>
      </div>
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

.action-tracker__header {
  margin-block-end: var(--spacing-md);
}

.action-tracker__header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.action-tracker__subtitle {
  margin: var(--spacing-xs) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.action-tracker__notice {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-block-end: var(--spacing-md);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: #f0f7f0;
  color: var(--color-primary-dark);
  font-size: var(--font-size-sm);
}

.action-tracker__error {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-block-end: var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.action-tracker__state {
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  text-align: center;
  color: var(--color-text-secondary);
}

.action-tracker__state--error h3 {
  color: var(--color-error);
}

.action-tracker__retry {
  margin-block-start: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.action-tracker__retry:hover {
  background-color: var(--color-primary-dark);
}

.action-tracker__progress {
  margin-block-end: var(--spacing-lg);
}

.action-tracker__progress-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-sm);
  margin-block-end: var(--spacing-sm);
}

.action-tracker__progress-state {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.action-tracker__progress-state--done {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.action-tracker__progress-state--in-progress {
  background-color: #e8f5e9;
  color: var(--color-primary-dark);
}

.action-tracker__progress-state--none {
  background-color: var(--color-border);
  color: var(--color-text-secondary);
}

.action-tracker__progress-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.action-tracker__overdue-note {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.action-tracker__bar {
  height: 10px;
  border-radius: var(--radius-sm);
  background-color: var(--color-border);
  overflow: hidden;
}

.action-tracker__bar-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-light);
  transition: width 0.3s ease;
}

.action-tracker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.action-tracker__item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.action-tracker__item--completed {
  background-color: var(--color-background);
}

.action-tracker__item:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.action-tracker__row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.action-tracker__check {
  flex-shrink: 0;
  margin-block-start: 2px;
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.action-tracker__body {
  flex: 1;
  min-width: 0;
}

.action-tracker__title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
}

.action-tracker__title {
  font-weight: var(--font-weight-semibold);
  word-break: break-word;
}

.action-tracker__title--done {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.action-tracker__badge {
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.action-tracker__badge--suggested {
  background-color: #e3f2fd;
  color: #1565c0;
}

.action-tracker__badge--overdue {
  background-color: #fdecea;
  color: var(--color-error);
}

.action-tracker__description {
  margin: var(--spacing-xs) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.action-tracker__due {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.action-tracker__controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.action-tracker__btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  cursor: pointer;
}

.action-tracker__btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-tracker__btn--danger {
  border-color: var(--color-error);
  color: var(--color-error);
}

.action-tracker__btn--danger:hover {
  background-color: var(--color-error);
  color: var(--color-surface);
}

.action-tracker__edit-form,
.action-tracker__add-form {
  padding: var(--spacing-md);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-lg);
  background-color: var(--color-background);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.action-tracker__date-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.action-tracker__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.action-tracker__date {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  width: 100%;
}

.action-tracker__date[aria-invalid='true'] {
  border-color: var(--color-error);
}

.action-tracker__field-error {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.action-tracker__form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.action-tracker__save {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.action-tracker__save:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.action-tracker__save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-tracker__cancel {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
}

.action-tracker__cancel:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-tracker__empty {
  padding: var(--spacing-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.action-tracker__add {
  margin-block-start: var(--spacing-md);
}

.action-tracker__add-toggle {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.action-tracker__add-toggle:hover {
  background-color: #f0f7f0;
}

@media (max-width: 575px) {
  .action-tracker__row {
    flex-wrap: wrap;
  }

  .action-tracker__controls {
    flex-direction: row;
    width: 100%;
    margin-block-start: var(--spacing-sm);
    padding-block-start: var(--spacing-sm);
    border-top: 1px solid var(--color-border);
  }
}
</style>