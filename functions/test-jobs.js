// BR (E.1) Cloud Functions:
// BR (E.2) Geo Location:
// BR (F.1) Innovation:
const assert = require('node:assert')
const { runProjectLifecycle } = require('./src/jobs/projectLifecycle')
const { runActionReminders } = require('./src/jobs/actionReminders')
const { buildRecommendations, getRecommendationsForUser } = require('./src/recommendations')

let passed = 0
let failed = 0
const failures = []

async function check(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (error) {
    failed += 1
    failures.push({ name, error })
    console.log(`FAIL  ${name}: ${error.message}`)
  }
}

function makeQuery(handlers) {
  const calls = []
  const query = async (sql, params = []) => {
    calls.push({ sql, params })
    for (const handler of handlers) {
      if (handler.match.test(sql)) {
        const result = typeof handler.rows === 'function' ? handler.rows(params) : handler.rows
        const rows = result || []
        return { rows, rowCount: rows.length }
      }
    }
    throw new Error(`No mock handler for SQL: ${sql.replace(/\s+/g, ' ').slice(0, 80)}`)
  }
  query.calls = calls
  query.callsTo = (pattern) => calls.filter((call) => pattern.test(call.sql))
  return query
}

async function main() {
  console.log('cloud functions jobs - local test harness (mock PostgreSQL)')

  await check('project lifecycle activates, completes and notifies participants + creators', async () => {
    const query = makeQuery([
      { match: /SET status = 'active'/, rows: [{ id: 1, title: 'Tree Planting Day', created_by: 10 }] },
      { match: /SET status = 'completed'/, rows: [{ id: 2, title: 'River Cleanup', created_by: 20 }] },
      {
        match: /FROM project_participations WHERE project_id/,
        rows: (params) => (params[0] === 1 ? [{ user_id: 11 }, { user_id: 12 }] : [{ user_id: 21 }]),
      },
      { match: /INSERT INTO notifications/, rows: [] },
    ])

    const summary = await runProjectLifecycle({ query, today: '2026-05-01', token: 'run-1' })

    assert.strictEqual(summary.activated, 1)
    assert.strictEqual(summary.completed, 1)
    assert.strictEqual(summary.notifications, 5)

    const activeUpdate = query.callsTo(/SET status = 'active'/)[0]
    assert.deepStrictEqual(activeUpdate.params, ['2026-05-01'])

    const inserts = query.callsTo(/INSERT INTO notifications/)
    assert.strictEqual(inserts.length, 2)
    const flatParams = inserts.flatMap((call) => call.params)
    assert.ok(flatParams.includes('run-1'), 'run token should be used for de-duplication')
    assert.ok(flatParams.includes(10) && flatParams.includes(11) && flatParams.includes(20) && flatParams.includes(21))
  })

  await check('project lifecycle reports zero work when nothing is due', async () => {
    const query = makeQuery([
      { match: /SET status = 'active'/, rows: [] },
      { match: /SET status = 'completed'/, rows: [] },
    ])

    const summary = await runProjectLifecycle({ query, today: '2026-05-01' })
    assert.deepStrictEqual(summary, { today: '2026-05-01', activated: 0, completed: 0, notifications: 0 })
  })

  await check('action reminders notify owners of plans due tomorrow', async () => {
    const query = makeQuery([
      {
        match: /FROM action_plans ap/,
        rows: [
          { id: 5, user_id: 7, title: 'Water seedlings', due_date: '2026-05-02', project_id: 1, project_title: 'Tree Planting Day' },
          { id: 6, user_id: 8, title: 'Sort recycling', due_date: '2026-05-02', project_id: 2, project_title: 'River Cleanup' },
        ],
      },
      { match: /INSERT INTO notifications/, rows: [] },
    ])

    const summary = await runActionReminders({ query, today: '2026-05-01', token: 'run-2' })

    assert.strictEqual(summary.dueTomorrow, 2)
    assert.strictEqual(summary.notifications, 2)

    const dueQuery = query.callsTo(/FROM action_plans ap/)[0]
    assert.deepStrictEqual(dueQuery.params, ['2026-05-01'])

    const insert = query.callsTo(/INSERT INTO notifications/)[0]
    assert.ok(insert.params.includes(7) && insert.params.includes(8))
    assert.ok(insert.params.some((value) => typeof value === 'string' && value.includes('Tree Planting Day')))
    assert.ok(insert.params.includes('/actions'))
  })

  await check('buildRecommendations ranks interest matches and explains why', async () => {
    const user = { interests: ['biodiversity'], location: 'Melbourne' }
    const projects = [
      {
        id: 100,
        title: 'Native Habitat Restoration',
        description: 'Restore habitat for native species',
        categoryId: 'habitat-restoration',
        category: { id: 'habitat-restoration', name: 'Habitat Restoration' },
        location: 'Melbourne',
        latitude: -37.8,
        longitude: 144.9,
        capacity: 30,
        status: 'active',
        volunteerCount: 5,
        avgRating: 4.5,
        ratingCount: 3,
      },
      {
        id: 101,
        title: 'Community Garden Compost',
        description: 'Compost food waste together',
        categoryId: 'community-garden',
        category: { id: 'community-garden', name: 'Community Garden' },
        location: 'Sydney',
        latitude: -33.8,
        longitude: 151.2,
        capacity: 20,
        status: 'planned',
        volunteerCount: 0,
        avgRating: 0,
        ratingCount: 0,
      },
      {
        id: 102,
        title: 'Full wetland project',
        description: 'Already at capacity',
        categoryId: 'waterway-care',
        category: { id: 'waterway-care', name: 'Waterway Care' },
        location: 'Brisbane',
        latitude: -27.4,
        longitude: 153,
        capacity: 10,
        status: 'active',
        volunteerCount: 10,
        avgRating: 5,
        ratingCount: 5,
      },
    ]

    const results = buildRecommendations(user, projects, { joined: [], created: [] }, { limit: 5 })

    assert.strictEqual(results[0].project.id, 100)
    assert.ok(!results.some((item) => item.project.id === 102), 'full projects should be excluded')
    assert.ok(results[0].reasons.some((reason) => reason.includes('Biodiversity')))
  })

  await check('getRecommendationsForUser loads user, projects and history from the database', async () => {
    const query = makeQuery([
      { match: /FROM users WHERE firebase_uid/, rows: [{ id: 1, interests: ['biodiversity'], location: 'Melbourne' }] },
      {
        match: /FROM projects p/,
        rows: [
          {
            id: 100,
            title: 'Native Habitat Restoration',
            description: 'Restore habitat',
            category_id: 'habitat-restoration',
            category_name: 'Habitat Restoration',
            location: 'Melbourne',
            latitude: '-37.8',
            longitude: '144.9',
            capacity: 30,
            status: 'active',
            volunteer_count: '5',
            avg_rating: '4.5',
            rating_count: '3',
          },
          {
            id: 101,
            title: 'Community Garden Compost',
            description: 'Compost',
            category_id: 'community-garden',
            category_name: 'Community Garden',
            location: 'Sydney',
            latitude: '-33.8',
            longitude: '151.2',
            capacity: 20,
            status: 'planned',
            volunteer_count: '0',
            avg_rating: '0',
            rating_count: '0',
          },
        ],
      },
      {
        match: /FROM project_participations pp/,
        rows: [{ id: 101, category_id: 'community-garden', latitude: '-33.8', longitude: '151.2' }],
      },
      { match: /FROM projects WHERE created_by/, rows: [] },
    ])

    const results = await getRecommendationsForUser({ query, uid: 'uid-1', limit: 5 })

    assert.strictEqual(results.length, 1)
    assert.strictEqual(results[0].project.id, 100)

    const userCall = query.callsTo(/FROM users WHERE firebase_uid/)[0]
    assert.deepStrictEqual(userCall.params, ['uid-1'])
  })

  await check('getRecommendationsForUser returns empty for unknown firebase uid', async () => {
    const query = makeQuery([{ match: /FROM users WHERE firebase_uid/, rows: [] }])
    const results = await getRecommendationsForUser({ query, uid: 'missing', limit: 5 })
    assert.deepStrictEqual(results, [])
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) {
    for (const { name, error } of failures) {
      console.error(`\n${name}\n${error.stack}`)
    }
    process.exit(1)
  }
}

main()
