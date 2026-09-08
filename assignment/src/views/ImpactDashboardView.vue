<script setup>
import { computed, onMounted, ref } from 'vue'
import ImpactMetricCard from '@/components/impact/ImpactMetricCard.vue'
import ImpactChart from '@/components/impact/ImpactChart.vue'
import ImpactSummary from '@/components/impact/ImpactSummary.vue'
import DataTable from '@/components/common/DataTable.vue'
import { getImpactOverview } from '@/services/impactService'
import { getCategories } from '@/services/categoryService'
import { exportCSV, exportPDF, dateStamp } from '@/services/exportService'

const categories = ref([])
const overview = ref(null)
const isLoading = ref(true)
const error = ref(null)

const selectedPeriod = ref('all')
const selectedCategory = ref('')
const selectedStatus = ref('')

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const periodOptions = [
  { value: 'all', label: 'All time' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
]

const filters = computed(() => ({
  period: selectedPeriod.value,
  categoryId: selectedCategory.value,
  status: selectedStatus.value,
}))

const summary = computed(() => overview.value?.summary ?? null)
const byCategory = computed(() => overview.value?.byCategory ?? [])
const byStatus = computed(() => overview.value?.byStatus ?? [])
const byMonth = computed(() => overview.value?.participationByMonth ?? [])
const comparison = computed(() => overview.value?.participantsComparison ?? { thisMonth: 0, previousMonth: 0, delta: 0 })
const projects = computed(() => overview.value?.projects ?? [])

const monthLabels = computed(() => ({
  '2026-01': 'Jan',
  '2026-02': 'Feb',
  '2026-03': 'Mar',
  '2026-04': 'Apr',
  '2026-05': 'May',
  '2026-06': 'Jun',
  '2026-07': 'Jul',
  '2026-08': 'Aug',
  '2026-09': 'Sep',
  '2026-10': 'Oct',
  '2026-11': 'Nov',
  '2026-12': 'Dec',
}))

const chartByCategory = computed(() =>
  byCategory.value.map((c) => ({ label: c.name, value: c.projectCount })),
)

const chartByStatus = computed(() =>
  byStatus.value.map((s) => ({ label: s.status, value: s.count })),
)

const chartByMonth = computed(() =>
  byMonth.value.map((m) => ({
    label: monthLabels.value[m.month] ?? m.month,
    value: m.count,
  })),
)

const tableColumns = [
  { key: 'title', label: 'Project' },
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
  { key: 'participants', label: 'Participants' },
  {
    key: 'averageRating',
    label: 'Rating',
    format: (val) => (val > 0 ? `${Number(val).toFixed(1)} / 5` : 'No ratings'),
  },
  { key: 'plantings', label: 'Plants' },
]

const exportBusy = ref(false)
const exportMessage = ref('')

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const exportRows = computed(() =>
  projects.value.map((p) => ({
    title: p.title,
    category: p.category,
    location: p.location,
    status: p.status,
    participants: p.participants,
    rating: p.ratingCount > 0 ? `${Number(p.averageRating).toFixed(1)} / 5` : 'No ratings',
    plantings: p.plantings,
    startDate: fmtDate(p.startDate),
  })),
)

const exportColumns = [
  { key: 'title', label: 'Project' },
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
  { key: 'participants', label: 'Participants' },
  { key: 'rating', label: 'Rating' },
  { key: 'plantings', label: 'Plants' },
  { key: 'startDate', label: 'Start Date' },
]

async function handleExportCsv() {
  if (exportBusy.value || exportRows.value.length === 0) return
  exportBusy.value = true
  exportMessage.value = ''
  try {
    await exportCSV({
      filename: `greenlink-impact-${dateStamp()}.csv`,
      columns: exportColumns,
      rows: exportRows.value,
    })
    exportMessage.value = `Exported ${exportRows.value.length} project${exportRows.value.length === 1 ? '' : 's'} to CSV.`
  } catch {
    exportMessage.value = 'Could not export CSV.'
  } finally {
    exportBusy.value = false
  }
}

async function handleExportPdf() {
  if (exportBusy.value || exportRows.value.length === 0) return
  exportBusy.value = true
  exportMessage.value = ''
  try {
    await exportPDF({
      filename: `greenlink-impact-${dateStamp()}.pdf`,
      title: 'GreenLink Project Impact',
      subtitle: `Generated ${new Date().toLocaleDateString('en-AU')} \u2022 ${exportRows.value.length} project${exportRows.value.length === 1 ? '' : 's'}`,
      columns: exportColumns,
      rows: exportRows.value,
    })
    exportMessage.value = `Exported ${exportRows.value.length} project${exportRows.value.length === 1 ? '' : 's'} to PDF.`
  } catch {
    exportMessage.value = 'Could not export PDF.'
  } finally {
    exportBusy.value = false
  }
}

async function loadData() {
  isLoading.value = true
  error.value = null
  exportMessage.value = ''
  try {
    overview.value = await getImpactOverview(filters.value)
  } catch (err) {
    error.value =
      err instanceof Error && err.message ? err.message : 'Could not load impact data.'
    overview.value = null
  } finally {
    isLoading.value = false
  }
}

function handleFilterChange() {
  loadData()
}

onMounted(async () => {
  try {
    const categoryData = await getCategories()
    categories.value = categoryData ?? []
  } catch {
    categories.value = []
  }
  await loadData()
})
</script>

<template>
  <section class="impact" aria-labelledby="impact-heading">
    <header class="impact__header">
      <div class="impact__header-row">
        <div>
          <h1 id="impact-heading">Project Impact Dashboard</h1>
          <p class="impact__intro">
            Live environmental and community impact across GreenLink projects, calculated from
            project, participation, rating and planting data.
          </p>
        </div>
        <div class="impact__export" aria-label="Export impact data">
          <button
            type="button"
            class="impact__export-btn"
            :disabled="exportBusy || exportRows.length === 0"
            @click="handleExportCsv"
          >
            {{ exportBusy ? 'Working\u2026' : 'Export CSV' }}
          </button>
          <button
            type="button"
            class="impact__export-btn impact__export-btn--pdf"
            :disabled="exportBusy || exportRows.length === 0"
            @click="handleExportPdf"
          >
            {{ exportBusy ? 'Working\u2026' : 'Export PDF' }}
          </button>
        </div>
      </div>
      <p v-if="exportMessage" role="status" class="impact__export-message">
        {{ exportMessage }}
      </p>
    </header>

    <div class="impact__filters" role="group" aria-label="Impact dashboard filters">
      <div class="impact__filter">
        <label class="impact__filter-label" for="impact-period">Time period</label>
        <select
          id="impact-period"
          v-model="selectedPeriod"
          class="impact__select"
          @change="handleFilterChange"
        >
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="impact__filter">
        <label class="impact__filter-label" for="impact-category">Category</label>
        <select
          id="impact-category"
          v-model="selectedCategory"
          class="impact__select"
          @change="handleFilterChange"
        >
          <option value="">All categories</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>

      <div class="impact__filter">
        <label class="impact__filter-label" for="impact-status">Status</label>
        <select
          id="impact-status"
          v-model="selectedStatus"
          class="impact__select"
          @change="handleFilterChange"
        >
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="impact__state">Loading impact data&hellip;</div>

    <div v-else-if="error" role="alert" class="impact__state impact__state--error">
      <h2>Could not load impact data</h2>
      <p>{{ error }}</p>
      <button type="button" class="impact__button" @click="loadData">Try again</button>
    </div>

    <template v-else-if="summary">
      <div class="impact__metrics" aria-label="Key impact metrics">
        <ImpactMetricCard
          label="Total projects"
          :value="summary.totalProjects"
          hint="Projects listed across all statuses in the current view."
        />
        <ImpactMetricCard
          label="Active projects"
          :value="summary.activeProjects"
          hint="Projects currently underway."
          tone="highlight"
        />
        <ImpactMetricCard label="Participants" :value="summary.participants"
          hint="Unique users taking part in these projects." />
        <ImpactMetricCard
          label="Sign-ups this month"
          :value="comparison.thisMonth"
          :hint="`Compared with ${comparison.previousMonth} last month (${comparison.delta >= 0 ? '+' : ''}${comparison.delta}).`"
        />
        <ImpactMetricCard
          label="Native plants"
          :value="summary.totalPlantings"
          :hint="`Across ${summary.speciesInvolved} species in ${summary.projectsWithPlants} project${summary.projectsWithPlants === 1 ? '' : 's'}.`"
        />
        <ImpactMetricCard
          label="Average rating"
          :value="summary.averageRating == null ? '—' : Number(summary.averageRating).toFixed(1)"
          :hint="summary.ratingCount > 0 ? `${summary.ratingCount} rating${summary.ratingCount === 1 ? '' : 's'} submitted.` : 'No ratings yet.'"
          tone="muted"
        />
      </div>

      <div class="impact__charts" aria-label="Impact charts">
        <ImpactChart
          title="Projects by category"
          description="How listed projects are distributed across GreenLink categories."
          :data="chartByCategory"
        />
        <ImpactChart
          title="Projects by status"
          description="Distribution of projects across planned, active, completed and cancelled."
          :data="chartByStatus"
        />
        <ImpactChart
          title="Participation over time"
          description="Number of participation sign-ups per month for the projects in this view."
          :data="chartByMonth"
        />
      </div>

      <ImpactSummary :summary="summary" :by-category="byCategory" />

      <section class="impact__projects" aria-labelledby="impact-projects-heading">
        <div class="impact__projects-header">
          <h2 id="impact-projects-heading">Projects in this view</h2>
          <p class="impact__projects-note">
            {{ projects.length }} project{{ projects.length === 1 ? '' : 's' }}.
            Use the search box to filter rows. Export captures the current filter state.
          </p>
        </div>
        <DataTable
          :rows="projects"
          :columns="tableColumns"
          row-key="id"
          empty-message="No projects match the current filters."
          caption="Impact dashboard projects"
          export-base-name="greenlink-impact-projects"
          export-title="GreenLink Impact Projects"
        />
      </section>

      <p class="impact__footnote">
        All figures are derived live from existing GreenLink data — project listings,
        participations, ratings and planting lists. No statistics are estimated or fabricated.
      </p>
    </template>
  </section>
</template>

<style scoped>
.impact {
  max-width: 1200px;
  margin-inline: auto;
}

.impact__header {
  margin-block-end: var(--spacing-lg);
}

.impact__header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.impact__intro {
  margin-top: var(--spacing-sm);
  max-width: 60ch;
  color: var(--color-text-secondary);
}

.impact__export {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.impact__export-btn {
  min-height: 40px;
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.impact__export-btn--pdf {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.impact__export-btn:hover:not(:disabled) {
  background-color: var(--color-primary);
  color: var(--color-surface);
}

.impact__export-btn--pdf:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.impact__export-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.impact__export-message {
  margin: var(--spacing-sm) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.impact__filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-lg);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.impact__filter {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.impact__filter-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.impact__select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  font-size: var(--font-size-sm);
}

.impact__state {
  padding: var(--spacing-xl);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-secondary);
}

.impact__state--error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.impact__button {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-surface);
  font-weight: var(--font-weight-semibold);
}

.impact__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-lg);
}

.impact__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
  margin-block-end: var(--spacing-lg);
}

.impact__projects {
  margin-block-start: var(--spacing-xl);
}

.impact__projects-header {
  margin-block-end: var(--spacing-md);
}

.impact__projects-note {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.impact__footnote {
  margin-block-start: var(--spacing-lg);
  padding: var(--spacing-md);
  border-left: 3px solid var(--color-primary-light);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>