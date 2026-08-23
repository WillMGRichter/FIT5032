const pool = require('../config/db')

const SESSION_DURATION_DAYS = 7

async function create(userId) {
  const { rows } = await pool.query(
    `INSERT INTO sessions (user_id)
     VALUES ($1)
     RETURNING id, user_id, expires_at`,
    [userId],
  )
  return {
    id: rows[0].id,
    userId: rows[0].user_id,
    expiresAt: rows[0].expires_at,
  }
}

async function findValidById(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? '')) {
    return null
  }
  const { rows } = await pool.query(
    'SELECT id, user_id, expires_at FROM sessions WHERE id = $1 AND expires_at > now()',
    [id],
  )
  return rows[0]
    ? { id: rows[0].id, userId: rows[0].user_id, expiresAt: rows[0].expires_at }
    : null
}

async function deleteById(id) {
  const { rowCount } = await pool.query('DELETE FROM sessions WHERE id = $1', [id])
  return rowCount > 0
}

module.exports = { create, findValidById, deleteById, SESSION_DURATION_DAYS }
