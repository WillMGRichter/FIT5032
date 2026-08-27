const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    link: row.link ?? null,
    createdAt: row.created_at,
  }
}

async function create({ userId, title, message, link }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, title, message, link)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, title, message, link ?? null],
  )
  return mapRow(rows[0])
}

async function createMany(items) {
  if (!items.length) return []

  const values = []
  const params = []
  items.forEach((item, i) => {
    const offset = i * 4
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`)
    params.push(item.userId, item.title, item.message, item.link ?? null)
  })

  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, title, message, link)
     VALUES ${values.join(', ')}
     RETURNING *`,
    params,
  )
  return rows.map(mapRow)
}

async function findByUser(userId, { unreadOnly } = {}) {
  const conditions = ['user_id = $1']
  const values = [userId]

  if (unreadOnly) {
    conditions.push('is_read = FALSE')
  }

  const { rows } = await pool.query(
    `SELECT * FROM notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 50`,
    values,
  )
  return rows.map(mapRow)
}

async function countUnread(userId) {
  const { rows } = await pool.query(
    'SELECT count(*)::int AS total FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId],
  )
  return rows[0].total
}

async function markAsRead(id, userId) {
  const { rowCount } = await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
    [id, userId],
  )
  return rowCount > 0
}

async function markAllAsRead(userId) {
  const { rowCount } = await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId],
  )
  return rowCount
}

async function deleteById(id, userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [id, userId],
  )
  return rowCount > 0
}

module.exports = {
  create,
  createMany,
  findByUser,
  countUnread,
  markAsRead,
  markAllAsRead,
  deleteById,
}
