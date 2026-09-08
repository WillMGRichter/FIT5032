const impactModel = require('../models/impactModel')

const VALID_STATUSES = ['planned', 'active', 'completed', 'cancelled']
const VALID_PERIODS = ['6m', '12m', 'all']

function dateBeforeNowMonths(months) {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().slice(0, 10)
}

function parseFilters(query) {
  const categoryId = query.categoryId?.trim() || null
  const status = query.status?.trim() || null
  const period = query.period?.trim() || 'all'

  if (status && !VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error('status must be planned, active, completed or cancelled.'), {
      status: 400,
    })
  }
  if (!VALID_PERIODS.includes(period)) {
    throw Object.assign(new Error('period must be 6m, 12m or all.'), { status: 400 })
  }

  const fromDate = period === '6m' ? dateBeforeNowMonths(6) : period === '12m' ? dateBeforeNowMonths(12) : null

  return { categoryId, status, fromDate }
}

async function getOverview(query) {
  const filters = parseFilters(query)

  const [
    overview,
    byCategory,
    byStatus,
    participationByMonth,
    participationComparison,
    projects,
  ] = await Promise.all([
    impactModel.getOverview(filters),
    impactModel.getProjectsByCategory(filters),
    impactModel.getProjectsByStatus(filters),
    impactModel.getParticipationByMonth(filters),
    impactModel.getParticipationComparison(filters),
    impactModel.getScopedProjects(filters),
  ])

  const participantsComparison = {
    thisMonth: Number(participationComparison?.this_month ?? 0),
    previousMonth: Number(participationComparison?.previous_month ?? 0),
    delta: Number(participationComparison?.this_month ?? 0) - Number(participationComparison?.previous_month ?? 0),
  }

  const byCategoryClean = byCategory.map((row) => ({
    id: row.id,
    name: row.name,
    projectCount: Number(row.project_count),
    participantCount: Number(row.participant_count),
    averageRating: row.average_rating ?? null,
    ratingCount: Number(row.rating_count),
  }))

  const byStatusClean = byStatus.map((row) => ({
    status: row.status,
    count: Number(row.count),
  }))

  const participationByMonthClean = participationByMonth.map((row) => ({
    month: row.month,
    count: Number(row.count),
  }))

  const projectsClean = projects.map((row) => ({
    id: Number(row.id),
    title: row.title,
    status: row.status,
    startDate: row.start_date,
    location: row.location,
    category: row.category_name,
    participants: Number(row.volunteer_count),
    averageRating: row.avg_rating ?? 0,
    ratingCount: Number(row.rating_count),
    plantings: Number(row.total_plantings),
  }))

  return {
    summary: {
      totalProjects: Number(overview.total_projects),
      activeProjects: Number(overview.active_projects),
      plannedProjects: Number(overview.planned_projects),
      completedProjects: Number(overview.completed_projects),
      cancelledProjects: Number(overview.cancelled_projects),
      participants: Number(overview.participants),
      participations: Number(overview.participations),
      ratingCount: Number(overview.rating_count),
      averageRating: overview.average_rating ?? null,
      totalPlantings: Number(overview.total_plantings),
      speciesInvolved: Number(overview.species_involved),
      projectsWithPlants: Number(overview.projects_with_plants),
    },
    byCategory: byCategoryClean,
    byStatus: byStatusClean,
    participationByMonth: participationByMonthClean,
    participantsComparison,
    projects: projectsClean,
  }
}

module.exports = { getOverview }