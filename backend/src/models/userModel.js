const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  }
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, full_name, role, created_at FROM users WHERE lower(email) = lower($1)',
    [email],
  )
  return rows[0] ?? null
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
    [id],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function create({ email, passwordHash, fullName }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, full_name, role, created_at`,
    [email.toLowerCase(), passwordHash, fullName],
  )
  return mapRow(rows[0])
}

module.exports = { findByEmail, findById, create }
