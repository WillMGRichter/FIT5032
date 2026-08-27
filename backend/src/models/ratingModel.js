const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    score: row.score,
    comment: row.comment ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function findByProject(projectId) {
  const { rows } = await pool.query(
    `SELECT r.*, u.first_name, u.last_name
       FROM project_ratings r
       JOIN users u ON u.id = r.user_id
      WHERE r.project_id = $1
      ORDER BY r.created_at DESC`,
    [projectId],
  )
  return rows.map((row) => ({
    ...mapRow(row),
    userName: `${row.first_name} ${row.last_name}`,
  }))
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM project_ratings WHERE id = $1', [id])
  return rows[0] ? mapRow(rows[0]) : null
}

async function findByProjectAndUser(projectId, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM project_ratings WHERE project_id = $1 AND user_id = $2',
    [projectId, userId],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function create({ projectId, userId, score, comment }) {
  const { rows } = await pool.query(
    `INSERT INTO project_ratings (project_id, user_id, score, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [projectId, userId, score, comment || null],
  )
  return mapRow(rows[0])
}

async function update(id, { score, comment }) {
  const { rows } = await pool.query(
    `UPDATE project_ratings
     SET score = $2, comment = $3, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, score, comment || null],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function deleteById(id) {
  const { rowCount } = await pool.query('DELETE FROM project_ratings WHERE id = $1', [id])
  return rowCount > 0
}

async function getAggregate(projectId) {
  const { rows } = await pool.query(
    `SELECT
       count(*)::int AS rating_count,
       coalesce(round(avg(score), 1), 0)::float AS average_score,
       count(*) FILTER (WHERE score = 1)::int AS star_1,
       count(*) FILTER (WHERE score = 2)::int AS star_2,
       count(*) FILTER (WHERE score = 3)::int AS star_3,
       count(*) FILTER (WHERE score = 4)::int AS star_4,
       count(*) FILTER (WHERE score = 5)::int AS star_5
     FROM project_ratings
     WHERE project_id = $1`,
    [projectId],
  )
  const row = rows[0]
  return {
    ratingCount: row.rating_count,
    averageScore: Number(row.average_score),
    breakdown: {
      1: row.star_1,
      2: row.star_2,
      3: row.star_3,
      4: row.star_4,
      5: row.star_5,
    },
  }
}

module.exports = {
  findById,
  findByProject,
  findByProjectAndUser,
  create,
  update,
  deleteById,
  getAggregate,
}
