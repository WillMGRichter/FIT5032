const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? '',
    dueDate: row.due_date ?? null,
    isSuggested: row.is_suggested,
    completed: row.completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function withDueDate(query, values) {
  const result = pool.query(
    `${query}
       RETURNING id, project_id, user_id, title, description,
                 to_char(due_date, 'YYYY-MM-DD') AS due_date, is_suggested,
                 completed, completed_at, created_at, updated_at`,
    values,
  )
  return result
}

async function getByUser(userId) {
  const { rows } = await pool.query(
    `SELECT a.*, to_char(a.due_date, 'YYYY-MM-DD') AS due_date,
            p.title AS project_title, p.status AS project_status,
            p.start_date AS project_start_date,
            c.id AS category_id, c.name AS category_name
       FROM action_plans a
       JOIN projects p ON p.id = a.project_id
       JOIN categories c ON c.id = p.category_id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC`,
    [userId],
  )
  return rows.map((row) => ({
    ...mapRow(row),
    projectTitle: row.project_title,
    projectStatus: row.project_status,
    projectStartDate: row.project_start_date,
    categoryId: row.category_id,
    categoryName: row.category_name,
  }))
}

async function getProjectActions(userId, projectId) {
  const { rows } = await pool.query(
    `SELECT a.*, to_char(a.due_date, 'YYYY-MM-DD') AS due_date
       FROM action_plans a
      WHERE a.user_id = $1 AND a.project_id = $2
      ORDER BY a.completed ASC, a.due_date ASC NULLS LAST, a.created_at ASC`,
    [userId, projectId],
  )
  return rows.map(mapRow)
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT a.*, to_char(a.due_date, 'YYYY-MM-DD') AS due_date
       FROM action_plans a
      WHERE a.id = $1`,
    [id],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function create({ projectId, userId, title, description, dueDate, isSuggested = false }) {
  const { rows } = await withDueDate(
    `INSERT INTO action_plans
       (project_id, user_id, title, description, due_date, is_suggested)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [projectId, userId, title, description || null, dueDate || null, isSuggested],
  )
  return mapRow(rows[0])
}

async function update(id, { title, description, dueDate }) {
  const { rows } = await withDueDate(
    `UPDATE action_plans
        SET title = $2, description = $3, due_date = $4, updated_at = now()
      WHERE id = $1`,
    [id, title, description ?? null, dueDate ?? null],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function updateCompletion(id, completed, completedAt) {
  const { rows } = await withDueDate(
    `UPDATE action_plans
        SET completed = $2, completed_at = $3, updated_at = now()
      WHERE id = $1`,
    [id, completed, completedAt],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function deleteById(id) {
  const { rowCount } = await pool.query('DELETE FROM action_plans WHERE id = $1', [id])
  return rowCount > 0
}

module.exports = {
  getByUser,
  getProjectActions,
  findById,
  create,
  update,
  updateCompletion,
  deleteById,
}