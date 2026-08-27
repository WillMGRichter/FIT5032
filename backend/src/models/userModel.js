const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid ?? null,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    role: row.role,
    profileImage: row.profile_image,
    bio: row.bio,
    location: row.location,
    createdAt: row.created_at,
  }
}

const PUBLIC_COLUMNS = `id, firebase_uid, email, first_name, last_name, role, profile_image, bio, location, created_at`

async function findByFirebaseUid(firebaseUid) {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE firebase_uid = $1`, [firebaseUid])
  return rows[0] ? mapRow(rows[0]) : null
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
    [email],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id])
  return rows[0] ? mapRow(rows[0]) : null
}

async function emailExistsExcept(email, userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2',
    [email, userId],
  )
  return rows.length > 0
}

async function createWithFirebase({ firebaseUid, email, firstName, lastName }) {
  const { rows } = await pool.query(
    `INSERT INTO users (firebase_uid, email, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [firebaseUid, email.toLowerCase(), firstName, lastName],
  )
  return mapRow(rows[0])
}

async function update(id, { email, firstName, lastName, bio, location, profileImage }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET email = $2,
         first_name = $3,
         last_name = $4,
         bio = $5,
         location = $6,
         profile_image = $7,
         updated_at = now()
     WHERE id = $1
     RETURNING ${PUBLIC_COLUMNS}`,
    [id, email.toLowerCase(), firstName, lastName, bio, location, profileImage],
  )
  return rows[0] ? mapRow(rows[0]) : null
}

module.exports = { findByFirebaseUid, findByEmail, findById, emailExistsExcept, createWithFirebase, update }
