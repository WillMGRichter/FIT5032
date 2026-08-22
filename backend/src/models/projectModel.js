const pool = require('../config/db')

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    category: row.category_name
      ? { id: row.category_id, name: row.category_name }
      : undefined,
    location: row.location,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    image: row.image,
    startDate: row.start_date,
    endDate: row.end_date,
    capacity: row.capacity,
    status: row.status,
    volunteerCount: row.volunteer_count ? Number(row.volunteer_count) : undefined,
  }
}

async function findAll({ status, categoryId } = {}) {
  const conditions = []
  const values = []

  if (status) {
    values.push(status)
    conditions.push(`p.status = $${values.length}`)
  }
  if (categoryId) {
    values.push(categoryId)
    conditions.push(`p.category_id = $${values.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name,
            (SELECT count(*) FROM project_participations pp WHERE pp.project_id = p.id) AS volunteer_count
       FROM projects p
       JOIN categories c ON c.id = p.category_id
       ${where}
      ORDER BY p.start_date`,
    values
  )

  return rows.map(mapRow)
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name, c.description AS category_description,
            (SELECT count(*) FROM project_participations pp WHERE pp.project_id = p.id) AS volunteer_count
       FROM projects p
       JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1`,
    [id]
  )

  if (rows.length === 0) return null

  const project = mapRow(rows[0])
  if (project.category) {
    project.category.description = rows[0].category_description
  }

  const plantRows = await pool.query(
    `SELECT pl.*, pp.quantity
       FROM project_plants pp
       JOIN plants pl ON pl.id = pp.plant_id
      WHERE pp.project_id = $1
      ORDER BY pl.common_name`,
    [id]
  )

  project.plants = plantRows.rows.map((row) => ({
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    quantity: row.quantity,
  }))

  return project
}

module.exports = { findAll, findById }
