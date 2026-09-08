const pool = require('../config/db')

function buildScope({ categoryId, status, fromDate }) {
  const conditions = []
  const values = []

  if (categoryId) {
    values.push(categoryId)
    conditions.push(`p.category_id = $${values.length}`)
  }
  if (status) {
    values.push(status)
    conditions.push(`p.status = $${values.length}`)
  }
  if (fromDate) {
    values.push(fromDate)
    conditions.push(`p.start_date >= $${values.length}`)
  }

  return { conditions, values }
}

function scopeWhere(scope, extra = null) {
  const parts = [...scope.conditions]
  if (extra) parts.push(extra)
  return parts.length ? `WHERE ${parts.join(' AND ')}` : ''
}

async function getOverview({ categoryId, status, fromDate }) {
  const scope = buildScope({ categoryId, status, fromDate })
  const values = scope.values

  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*) FROM projects p ${scopeWhere(scope)})::int AS total_projects,
       (SELECT count(*) FROM projects p ${scopeWhere(scope, "p.status = 'active'")})::int AS active_projects,
       (SELECT count(*) FROM projects p ${scopeWhere(scope, "p.status = 'planned'")})::int AS planned_projects,
       (SELECT count(*) FROM projects p ${scopeWhere(scope, "p.status = 'completed'")})::int AS completed_projects,
       (SELECT count(*) FROM projects p ${scopeWhere(scope, "p.status = 'cancelled'")})::int AS cancelled_projects,
       (SELECT count(DISTINCT pp.user_id) FROM project_participations pp JOIN projects p ON p.id = pp.project_id ${scopeWhere(scope)})::int AS participants,
       (SELECT count(*) FROM project_participations pp JOIN projects p ON p.id = pp.project_id ${scopeWhere(scope)})::int AS participations,
       (SELECT count(*) FROM project_ratings r JOIN projects p ON p.id = r.project_id ${scopeWhere(scope)})::int AS rating_count,
       (SELECT ROUND(AVG(score)::numeric, 1)::float FROM project_ratings r JOIN projects p ON p.id = r.project_id ${scopeWhere(scope)}) AS average_rating,
       (SELECT COALESCE(SUM(quantity), 0)::int FROM project_plants pp JOIN projects p ON p.id = pp.project_id ${scopeWhere(scope)}) AS total_plantings,
       (SELECT count(DISTINCT pp.plant_id) FROM project_plants pp JOIN projects p ON p.id = pp.project_id ${scopeWhere(scope)})::int AS species_involved,
       (SELECT count(DISTINCT pp.project_id) FROM project_plants pp JOIN projects p ON p.id = pp.project_id ${scopeWhere(scope)})::int AS projects_with_plants`,
    values,
  )

  return rows[0]
}

async function getProjectsByCategory({ categoryId, status, fromDate }) {
  const scope = buildScope({ categoryId, status, fromDate })
  const values = scope.values

  const { rows } = await pool.query(
    `SELECT c.id,
            c.name,
            (SELECT count(*) FROM projects p
              WHERE p.category_id = c.id ${scopeAnd(scope)})::int AS project_count,
            (SELECT count(DISTINCT pp.user_id) FROM project_participations pp JOIN projects p ON p.id = pp.project_id
              WHERE p.category_id = c.id ${scopeAnd(scope)})::int AS participant_count,
            (SELECT ROUND(AVG(score)::numeric, 1)::float FROM project_ratings r JOIN projects p ON p.id = r.project_id
              WHERE p.category_id = c.id ${scopeAnd(scope)}) AS average_rating,
            (SELECT count(*) FROM project_ratings r JOIN projects p ON p.id = r.project_id
              WHERE p.category_id = c.id ${scopeAnd(scope)})::int AS rating_count
       FROM categories c
      ORDER BY project_count DESC, c.name`,
    values,
  )

  return rows
}

function scopeAnd(scope) {
  return scope.conditions.length ? `AND ${scope.conditions.join(' AND ')}` : ''
}

async function getProjectsByStatus({ categoryId, status, fromDate }) {
  const scope = buildScope({ categoryId, status, fromDate })
  const { rows } = await pool.query(
    `SELECT p.status, count(*)::int AS count
       FROM projects p ${scopeWhere(scope)}
      GROUP BY p.status
      ORDER BY count DESC, p.status`,
    scope.values,
  )
  return rows
}

async function getParticipationByMonth({ categoryId, status, fromDate }) {
  const scope = buildScope({ categoryId, status, fromDate })
  const { rows } = await pool.query(
    `SELECT to_char(date_trunc('month', pp.joined_at), 'YYYY-MM') AS month,
            count(*)::int AS count
       FROM project_participations pp
       JOIN projects p ON p.id = pp.project_id
       ${scopeWhere(scope)}
      GROUP BY 1
      ORDER BY 1`,
    scope.values,
  )
  return rows
}

async function getParticipationComparison({ categoryId, status, fromDate }) {
  const scope = buildScope({ categoryId, status, fromDate })
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*) FROM project_participations pp JOIN projects p ON p.id = pp.project_id
         ${scopeWhere(scope, "date_trunc('month', pp.joined_at) = date_trunc('month', CURRENT_DATE)")})::int AS this_month,
       (SELECT count(*) FROM project_participations pp JOIN projects p ON p.id = pp.project_id
         ${scopeWhere(scope, "date_trunc('month', pp.joined_at) = date_trunc('month', CURRENT_DATE) - interval '1 month'")})::int AS previous_month`,
    scope.values,
  )
  return rows[0]
}

async function getScopedProjects({ categoryId, status, fromDate }) {
  const scope = buildScope({ categoryId, status, fromDate })
  const { rows } = await pool.query(
    `SELECT p.id,
            p.title,
            p.status,
            p.start_date,
            p.location,
            c.name AS category_name,
            (SELECT count(*) FROM project_participations pp WHERE pp.project_id = p.id)::int AS volunteer_count,
            COALESCE(r.avg_score, 0)::float AS avg_rating,
            COALESCE(r.rating_count, 0)::int AS rating_count,
            COALESCE(pl.total_plantings, 0)::int AS total_plantings
       FROM projects p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT project_id, ROUND(AVG(score)::numeric, 1)::float AS avg_score, count(*)::int AS rating_count
           FROM project_ratings
          GROUP BY project_id
       ) r ON r.project_id = p.id
       LEFT JOIN (
         SELECT project_id, SUM(quantity)::int AS total_plantings
           FROM project_plants
          GROUP BY project_id
       ) pl ON pl.project_id = p.id
       ${scopeWhere(scope)}
      ORDER BY p.start_date`,
    scope.values,
  )
  return rows
}

module.exports = {
  getOverview,
  getProjectsByCategory,
  getProjectsByStatus,
  getParticipationByMonth,
  getParticipationComparison,
  getScopedProjects,
}