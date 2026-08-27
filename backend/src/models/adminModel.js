const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    role: row.role,
    createdAt: row.created_at,
  }
}

async function listUsers() {
  const { rows } = await pool.query(
    'SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at',
  )
  return rows.map(mapRow)
}

async function updateUserRole(id, role) {
  const { rows } = await pool.query(
    'UPDATE users SET role = $2, updated_at = now() WHERE id = $1 RETURNING id, email, first_name, last_name, role, created_at',
    [id, role],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function deleteUser(id) {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id])
  return rowCount > 0
}

async function getStats() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*) FROM users)::int AS user_count,
      (SELECT count(*) FROM projects)::int AS project_count,
      (SELECT count(*) FROM project_participations)::int AS participation_count,
      (SELECT count(*) FROM plants)::int AS plant_count
  `)
  return rows[0]
}

module.exports = { listUsers, updateUserRole, deleteUser, getStats }
