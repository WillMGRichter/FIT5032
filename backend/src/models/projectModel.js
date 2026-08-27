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
    createdBy: row.created_by ?? null,
    volunteerCount: row.volunteer_count ? Number(row.volunteer_count) : undefined,
    avgRating: row.avg_rating ? Number(row.avg_rating) : 0,
    ratingCount: row.rating_count ? Number(row.rating_count) : 0,
  }
}

async function findAll({ status, categoryId, createdBy } = {}) {
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
  if (createdBy) {
    values.push(createdBy)
    conditions.push(`p.created_by = $${values.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name,
            (SELECT count(*) FROM project_participations pp WHERE pp.project_id = p.id) AS volunteer_count,
            COALESCE(r.avg_score, 0) AS avg_rating,
            COALESCE(r.rating_count, 0) AS rating_count
       FROM projects p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT project_id,
                ROUND(AVG(score)::numeric, 1) AS avg_score,
                count(*)::int AS rating_count
           FROM project_ratings
          GROUP BY project_id
       ) r ON r.project_id = p.id
       ${where}
      ORDER BY p.start_date`,
    values
  )

  return rows.map(mapRow)
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name, c.description AS category_description,
            u.id AS creator_id, u.first_name AS creator_first_name, u.last_name AS creator_last_name,
            (SELECT count(*) FROM project_participations pp WHERE pp.project_id = p.id) AS volunteer_count,
            COALESCE(r.avg_score, 0) AS avg_rating,
            COALESCE(r.rating_count, 0) AS rating_count
       FROM projects p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN (
         SELECT project_id,
                ROUND(AVG(score)::numeric, 1) AS avg_score,
                count(*)::int AS rating_count
           FROM project_ratings
          GROUP BY project_id
       ) r ON r.project_id = p.id
      WHERE p.id = $1`,
    [id]
  )

  if (rows.length === 0) return null

  const project = mapRow(rows[0])
  if (project.category) {
    project.category.description = rows[0].category_description
  }
  if (rows[0].creator_id) {
    project.creator = {
      id: rows[0].creator_id,
      fullName: `${rows[0].creator_first_name} ${rows[0].creator_last_name}`,
    }
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

async function create(input) {
  const { rows } = await pool.query(
    `INSERT INTO projects
       (title, description, category_id, location, latitude, longitude, image,
        start_date, end_date, capacity, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      input.title,
      input.description,
      input.categoryId,
      input.location,
      input.latitude,
      input.longitude,
      input.image ?? null,
      input.startDate,
      input.endDate,
      input.capacity,
      input.status,
      input.createdBy ?? null,
    ]
  )
  return findById(rows[0].id)
}

async function update(id, input) {
  const result = await pool.query(
    `UPDATE projects SET
       title = $2,
       description = $3,
       category_id = $4,
       location = $5,
       latitude = $6,
       longitude = $7,
       image = $8,
       start_date = $9,
       end_date = $10,
       capacity = $11,
       status = $12,
       updated_at = now()
     WHERE id = $1`,
    [
      id,
      input.title,
      input.description,
      input.categoryId,
      input.location,
      input.latitude,
      input.longitude,
      input.image ?? null,
      input.startDate,
      input.endDate,
      input.capacity,
      input.status,
    ]
  )

  if (result.rowCount === 0) return null
  return findById(id)
}

async function findJoinedByUser(userId) {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name,
            pp.role AS participation_role, pp.joined_at AS participation_joined_at,
            (SELECT count(*) FROM project_participations pp2 WHERE pp2.project_id = p.id) AS volunteer_count,
            COALESCE(r.avg_score, 0) AS avg_rating,
            COALESCE(r.rating_count, 0) AS rating_count
       FROM project_participations pp
       JOIN projects p ON p.id = pp.project_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT project_id,
                ROUND(AVG(score)::numeric, 1) AS avg_score,
                count(*)::int AS rating_count
           FROM project_ratings
          GROUP BY project_id
       ) r ON r.project_id = p.id
      WHERE pp.user_id = $1
      ORDER BY p.start_date`,
    [userId]
  )

  return rows.map((row) => ({
    ...mapRow(row),
    participation: {
      role: row.participation_role,
      joinedAt: row.participation_joined_at,
    },
  }))
}

async function findParticipation(projectId, userId) {
  const { rows } = await pool.query(
    'SELECT project_id, user_id, role, joined_at FROM project_participations WHERE project_id = $1 AND user_id = $2',
    [projectId, userId],
  )
  return rows[0]
    ? {
        projectId: rows[0].project_id,
        userId: rows[0].user_id,
        role: rows[0].role,
        joinedAt: rows[0].joined_at,
      }
    : null
}

async function countParticipations(projectId) {
  const { rows } = await pool.query(
    'SELECT count(*)::int AS total FROM project_participations WHERE project_id = $1',
    [projectId],
  )
  return rows[0].total
}

async function createParticipation(projectId, userId, role = 'volunteer') {
  const { rows } = await pool.query(
    `INSERT INTO project_participations (project_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO NOTHING
     RETURNING project_id, user_id, role, joined_at`,
    [projectId, userId, role],
  )
  return rows[0]
    ? {
        projectId: rows[0].project_id,
        userId: rows[0].user_id,
        role: rows[0].role,
        joinedAt: rows[0].joined_at,
      }
    : null
}

async function deleteParticipation(projectId, userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM project_participations WHERE project_id = $1 AND user_id = $2',
    [projectId, userId],
  )
  return rowCount > 0
}

function mapPlantRow(row) {
  return {
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    description: row.description,
    image: row.image,
    habitat: row.habitat,
    maintenanceLevel: row.maintenance_level,
    quantity: row.quantity,
  }
}

async function findPlantsByProject(projectId) {
  const { rows } = await pool.query(
    `SELECT pl.*, pp.quantity
       FROM project_plants pp
       JOIN plants pl ON pl.id = pp.plant_id
      WHERE pp.project_id = $1
      ORDER BY pl.common_name`,
    [projectId]
  )
  return rows.map(mapPlantRow)
}

async function setProjectPlants(projectId, plantIds) {
  await pool.query('DELETE FROM project_plants WHERE project_id = $1', [projectId])
  if (!plantIds.length) return

  const values = []
  const params = []
  plantIds.forEach((plantId, index) => {
    values.push(`($1, $${index + 2})`)
    params.push(plantId)
  })
  await pool.query(
    `INSERT INTO project_plants (project_id, plant_id)
     VALUES ${values.join(', ')}
     ON CONFLICT (project_id, plant_id) DO NOTHING`,
    [projectId, ...params]
  )
}

async function deleteById(id) {
  const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [id])
  return rowCount > 0
}

async function findByPlant(plantId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.location, p.status, p.start_date, p.end_date, p.image,
            pp.quantity,
            c.name AS category_name
       FROM project_plants pp
       JOIN projects p ON p.id = pp.project_id
       JOIN categories c ON c.id = p.category_id
      WHERE pp.plant_id = $1
      ORDER BY p.start_date`,
    [plantId]
  )
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    location: row.location,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    image: row.image,
    quantity: row.quantity,
    category: { name: row.category_name },
  }))
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  deleteById,
  findByPlant,
  findJoinedByUser,
  findParticipation,
  countParticipations,
  createParticipation,
  deleteParticipation,
  findPlantsByProject,
  setProjectPlants,
}
