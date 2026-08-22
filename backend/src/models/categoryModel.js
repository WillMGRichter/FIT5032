const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  }
}

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY name')
  return rows.map(mapRow)
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id])
  return rows.length ? mapRow(rows[0]) : null
}

module.exports = { findAll, findById }
