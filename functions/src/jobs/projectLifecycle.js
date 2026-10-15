const ACTIVATED_TITLE = 'Project started'
const COMPLETED_TITLE = 'Project completed'

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function projectLink(projectId) {
  return `/projects/${projectId}`
}

function buildRecipientIds(projectId, participantRows, creatorId) {
  const ids = new Set()
  for (const row of participantRows) {
    if (row && row.user_id != null) ids.add(Number(row.user_id))
  }
  if (creatorId != null) ids.add(Number(creatorId))
  return [...ids]
}

function buildNotifications(project, userIds, kind) {
  const isActivated = kind === 'active'
  const title = isActivated ? ACTIVATED_TITLE : COMPLETED_TITLE
  const message = isActivated
    ? `"${project.title}" has started. Join in and get involved.`
    : `"${project.title}" has been completed. Thanks for your contribution.`
  const link = projectLink(project.id)
  return userIds.map((userId) => ({ userId, title, message, link }))
}

async function insertNotifications(query, items, token) {
  const pending = items.filter((item) => item)
  if (!pending.length) return 0

  const values = []
  const params = [token]
  pending.forEach((item, index) => {
    const offset = index * 4 + 2
    values.push(`($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3})`)
    params.push(item.userId, item.title, item.message, item.link ?? null)
  })

  await query(
    `INSERT INTO notifications (user_id, title, message, link)
     SELECT v.user_id::bigint, v.title::varchar, v.message::text, v.link::varchar
       FROM (VALUES ${values.join(', ')}) AS v(user_id, title, message, link)
       JOIN users u ON u.id = v.user_id::bigint
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
         WHERE n.user_id = v.user_id
           AND n.title = v.title
           AND n.message = v.message
           AND n.created_at >= $1::timestamptz
      )`,
    params,
  )

  return pending.length
}

async function notifyForProject(query, project, kind, token) {
  const { rows } = await query(
    'SELECT user_id FROM project_participations WHERE project_id = $1',
    [project.id],
  )
  const userIds = buildRecipientIds(project.id, rows, project.created_by)
  return insertNotifications(query, buildNotifications(project, userIds, kind), token)
}

async function runProjectLifecycle({ query, today = utcDateString(), token = null } = {}) {
  if (typeof query !== 'function') throw new Error('runProjectLifecycle requires a query function')

  const startedAt = token || new Date().toISOString()

  const activated = await query(
    `UPDATE projects
        SET status = 'active', updated_at = now()
      WHERE status = 'planned' AND start_date <= $1::date
      RETURNING id, title, created_by`,
    [today],
  )

  const completed = await query(
    `UPDATE projects
        SET status = 'completed', updated_at = now()
      WHERE status = 'active' AND end_date < $1::date
      RETURNING id, title, created_by`,
    [today],
  )

  let notifications = 0
  for (const project of activated.rows) {
    notifications += await notifyForProject(query, project, 'active', startedAt)
  }
  for (const project of completed.rows) {
    notifications += await notifyForProject(query, project, 'completed', startedAt)
  }

  return {
    today,
    activated: activated.rows.length,
    completed: completed.rows.length,
    notifications,
  }
}

module.exports = { runProjectLifecycle, utcDateString }
