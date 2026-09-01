<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  pageSize: { type: Number, default: 10 },
  emptyMessage: { type: String, default: 'No records found.' },
  caption: { type: String, default: '' },
})

const globalSearch = ref('')
const sortKey = ref('')
const sortDirection = ref('asc')
const currentPage = ref(1)

const filterInputs = ref({})
props.columns.forEach((col) => {
  if (col.searchable) {
    filterInputs.value[col.key] = ''
  }
})

watch(
  () => props.columns,
  (cols) => {
    cols.forEach((col) => {
      if (col.searchable && !(col.key in filterInputs.value)) {
        filterInputs.value[col.key] = ''
      }
    })
  },
)

function getNestedValue(row, key) {
  return key.split('.').reduce((obj, k) => (obj != null ? obj[k] : undefined), row)
}

function cellText(row, col) {
  const raw = getNestedValue(row, col.key)
  if (col.format) return col.format(raw, row)
  if (raw == null) return ''
  return String(raw)
}

const filteredRows = computed(() => {
  let result = [...props.rows]

  if (globalSearch.value.trim()) {
    const q = globalSearch.value.trim().toLowerCase()
    result = result.filter((row) =>
      props.columns.some((col) => {
        const val = getNestedValue(row, col.key)
        if (val == null) return false
        return String(val).toLowerCase().includes(q)
      }),
    )
  }

  props.columns.forEach((col) => {
    const filterVal = (filterInputs.value[col.key] || '').trim().toLowerCase()
    if (!filterVal) return
    result = result.filter((row) => {
      const val = getNestedValue(row, col.key)
      if (val == null) return false
      if (col.searchFormat) {
        return col.searchFormat(val, row).toLowerCase().includes(filterVal)
      }
      return String(val).toLowerCase().includes(filterVal)
    })
  })

  return result
})

const sortedRows = computed(() => {
  if (!sortKey.value) return filteredRows.value

  const col = props.columns.find((c) => c.key === sortKey.value)
  const dir = sortDirection.value === 'asc' ? 1 : -1

  return [...filteredRows.value].sort((a, b) => {
    let aVal = getNestedValue(a, sortKey.value)
    let bVal = getNestedValue(b, sortKey.value)

    if (col && col.sortValue) {
      aVal = col.sortValue(aVal, a)
      bVal = col.sortValue(bVal, b)
    }

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir
    }

    return String(aVal).localeCompare(String(bVal)) * dir
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / props.pageSize)))

watch(
  [filteredRows, totalPages],
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
  },
)

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  return sortedRows.value.slice(start, start + props.pageSize)
})

const rangeStart = computed(() =>
  sortedRows.value.length === 0 ? 0 : (currentPage.value - 1) * props.pageSize + 1,
)
const rangeEnd = computed(() =>
  Math.min(currentPage.value * props.pageSize, sortedRows.value.length),
)

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []

  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  start = Math.max(1, end - 4)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
  currentPage.value = 1
}

function handleColumnFilter(key, value) {
  filterInputs.value[key] = value
  currentPage.value = 1
}

function handleGlobalSearch(value) {
  globalSearch.value = value
  currentPage.value = 1
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

</script>

<template>
  <div class="data-table">
    <div class="data-table__toolbar">
      <label class="data-table__search-label" for="dt-global-search">
        <span class="sr-only">Search all columns</span>
        <input
          id="dt-global-search"
          type="search"
          class="data-table__search-input"
          placeholder="Search\u2026"
          :value="globalSearch"
          @input="handleGlobalSearch($event.target.value)"
        />
      </label>
    </div>

    <div class="data-table__wrapper">
      <table class="data-table__table">
        <caption v-if="caption" class="sr-only">{{ caption }}</caption>
        <thead class="data-table__head">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :class="[
                'data-table__th',
                {
                  'data-table__th--sortable': col.sortable !== false,
                  'data-table__th--sorted': sortKey === col.key,
                },
              ]"
              :aria-sort="
                sortKey === col.key
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              "
            >
              <template v-if="col.sortable !== false">
                <button
                  type="button"
                  class="data-table__th-button"
                  :aria-label="`Sort by ${col.label}${
                    sortKey === col.key
                      ? sortDirection === 'asc'
                        ? ', ascending'
                        : ', descending'
                      : ''
                  }`"
                  @click="toggleSort(col.key)"
                >
                  <span class="data-table__th-content">
                    <span>{{ col.label }}</span>
                    <span v-if="sortKey === col.key" class="data-table__sort-icon" aria-hidden="true">
                      {{ sortDirection === 'asc' ? '\u25B2' : '\u25BC' }}
                    </span>
                    <span
                      v-else
                      class="data-table__sort-icon data-table__sort-icon--idle"
                      aria-hidden="true"
                    >
                      &#8693;
                    </span>
                  </span>
                </button>
              </template>
              <template v-else>
                <div class="data-table__th-content">
                  <span>{{ col.label }}</span>
                </div>
              </template>
            </th>
          </tr>
          <tr class="data-table__filter-row">
            <th
              v-for="col in columns"
              :key="'filter-' + col.key"
              scope="col"
              class="data-table__filter-th"
            >
              <label :for="'dt-filter-' + col.key" class="sr-only">
                Search {{ col.label }}
              </label>
              <input
                v-if="col.searchable !== false"
                :id="'dt-filter-' + col.key"
                type="search"
                class="data-table__filter-input"
                :placeholder="col.filterPlaceholder || 'Search ' + col.label"
                :value="filterInputs[col.key] || ''"
                @input="handleColumnFilter(col.key, $event.target.value)"
              />
            </th>
          </tr>
        </thead>
        <tbody class="data-table__body">
          <tr v-if="pagedRows.length === 0">
            <td :colspan="columns.length" class="data-table__empty">
              {{ emptyMessage }}
            </td>
          </tr>
          <tr v-for="row in pagedRows" :key="row[rowKey]" class="data-table__row">
            <td
              v-for="col in columns"
              :key="col.key"
              class="data-table__td"
            >
              <slot
                v-if="$slots[`cell-${col.key}`]"
                :name="`cell-${col.key}`"
                :row="row"
                :value="getNestedValue(row, col.key)"
              />
              <template v-else>
                <span
                  v-if="col.cellClass"
                  :class="col.cellClass(getNestedValue(row, col.key), row)"
                >
                  {{ cellText(row, col) }}
                </span>
                <template v-else>{{ cellText(row, col) }}</template>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="data-table__footer">
      <p class="data-table__info" aria-live="polite">
        Showing {{ rangeStart }}&ndash;{{ rangeEnd }} of {{ sortedRows.length }}
      </p>
      <nav class="data-table__pagination" aria-label="Table pagination">
        <button
          type="button"
          class="data-table__page-btn"
          :disabled="currentPage <= 1"
          aria-label="Previous page"
          @click="goToPage(currentPage - 1)"
        >
          &lsaquo; Previous
        </button>
        <button
          v-for="page in pageNumbers"
          :key="page"
          type="button"
          class="data-table__page-num"
          :class="{ 'data-table__page-num--active': page === currentPage }"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          class="data-table__page-btn"
          :disabled="currentPage >= totalPages"
          aria-label="Next page"
          @click="goToPage(currentPage + 1)"
        >
          Next &rsaquo;
        </button>
      </nav>
    </div>
  </div>
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

.data-table {
  width: 100%;
}

.data-table__toolbar {
  display: flex;
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-md);
}

.data-table__search-label {
  flex: 1;
  max-width: 360px;
}

.data-table__search-input,
.data-table__filter-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.data-table__search-input:focus,
.data-table__filter-input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
}

.data-table__wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.data-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  min-width: 600px;
}

.data-table__head {
  background-color: var(--color-background);
}

.data-table__th {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  border-bottom: 2px solid var(--color-border);
  user-select: none;
}

.data-table__th--sortable:hover {
  background-color: var(--color-border);
}

.data-table__th--sortable {
  cursor: default;
}

.data-table__th--sorted {
  color: var(--color-primary-dark);
}

.data-table__th-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.data-table__th-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  text-align: left;
  cursor: pointer;
}

.data-table__th--sortable:hover .data-table__th-button {
  color: var(--color-primary-dark);
}

.data-table__sort-icon {
  font-size: var(--font-size-xs);
  line-height: 1;
}

.data-table__sort-icon--idle {
  opacity: 0.3;
}

.data-table__filter-row {
  background-color: var(--color-background);
}

.data-table__filter-th {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  font-weight: var(--font-weight-regular);
}

.data-table__filter-input {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.data-table__body tr {
  border-bottom: 1px solid var(--color-border);
}

.data-table__body tr:last-child {
  border-bottom: none;
}

.data-table__row:hover {
  background-color: var(--color-background);
}

.data-table__td {
  padding: var(--spacing-sm) var(--spacing-md);
  vertical-align: middle;
}

.data-table__empty {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.data-table__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0;
}

.data-table__info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.data-table__pagination {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.data-table__page-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.data-table__page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.data-table__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.data-table__page-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.data-table__page-num:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.data-table__page-num--active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 575px) {
  .data-table__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .data-table__toolbar {
    flex-direction: column;
  }

  .data-table__search-label {
    max-width: 100%;
  }
}
</style>
