const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    description: row.description,
    image: row.image,
    habitat: row.habitat,
    maintenanceLevel: row.maintenance_level,
  }
}

async function findAll({ maintenanceLevel } = {}) {
  if (maintenanceLevel) {
    const { rows } = await pool.query(
      'SELECT * FROM plants WHERE maintenance_level = $1 ORDER BY common_name',
      [maintenanceLevel]
    )
    return rows.map(mapRow)
  }

  const { rows } = await pool.query('SELECT * FROM plants ORDER BY common_name')
  return rows.map(mapRow)
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM plants WHERE id = $1', [id])
  return rows.length ? mapRow(rows[0]) : null
}

async function findByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const { rows } = await pool.query('SELECT * FROM plants WHERE id = ANY($1::bigint[]) ORDER BY common_name', [
    ids,
  ])
  return rows.map(mapRow)
}

module.exports = { findAll, findById, findByIds }
