const REMINDER_TITLE = 'Action due tomorrow'

// Formats a date as YYYY-MM-DD.
function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

// Adds notifications for actions due the next day.
async function runActionReminders({ query, today = utcDateString(), token = null } = {}) {
  if (typeof query !== 'function') throw new Error('runActionReminders requires a query function')

  const startedAt = token || new Date().toISOString()

  const { rows } = await query(
    `SELECT ap.id, ap.user_id, ap.title, ap.due_date, ap.project_id, p.title AS project_title
       FROM action_plans ap
       JOIN projects p ON p.id = ap.project_id
      WHERE ap.completed = FALSE
        AND ap.due_date = ($1::date + 1)
      ORDER BY ap.user_id`,
    [today],
  )

  if (!rows.length) {
    return { today, dueTomorrow: 0, notifications: 0 }
  }

  const values = []
  const params = [startedAt]
  rows.forEach((row, index) => {
    const offset = index * 4 + 2
    values.push(`($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3})`)
    params.push(
      row.user_id,
      REMINDER_TITLE,
      `"${row.title}" for "${row.project_title}" is due tomorrow.`,
      `/actions`,
    )
  })

  await query(
    `INSERT INTO notifications (user_id, title, message, link)
     SELECT v.user_id::bigint, v.title::varchar, v.message::text, v.link::varchar
       FROM (VALUES ${values.join(', ')}) AS v(user_id, title, message, link)
       JOIN users u ON u.id = v.user_id::bigint
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications n
         WHERE n.user_id = v.user_id::bigint
           AND n.title = v.title::varchar
           AND n.message = v.message::text
           -- Skip reminders already created in this run.
           AND n.created_at >= $1::timestamptz
      )`,
    params,
  )

  return { today, dueTomorrow: rows.length, notifications: rows.length }
}

module.exports = { runActionReminders, utcDateString }
