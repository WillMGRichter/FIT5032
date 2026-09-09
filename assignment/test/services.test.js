import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRecommendedProjects } from '../src/services/recommendationService.js'
import { getPersonalImpact } from '../src/services/personalImpactService.js'
import { dateStamp, buildCsv, formatCell } from '../src/services/exportService.js'
import { getSuggestedActionsForProject } from '../src/services/actionSuggestionService.js'

const todayISO = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function makeProject(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? 'Test project',
    description: overrides.description ?? 'A GreenLink volunteer project with native plantings for the community.',
    location: overrides.location ?? 'Melbourne',
    categoryId: overrides.categoryId ?? 'tree-planting',
    category: { id: overrides.categoryId ?? 'tree-planting', name: overrides.categoryName ?? 'Tree Planting' },
    status: overrides.status ?? 'active',
    capacity: overrides.capacity ?? 30,
    volunteerCount: overrides.volunteerCount ?? 5,
    avgRating: overrides.avgRating ?? 0,
    ratingCount: overrides.ratingCount ?? 0,
    latitude: overrides.latitude ?? -37.8,
    longitude: overrides.longitude ?? 144.95,
  }
}

test('Innovation #2 — recommendations differ based on user interests', () => {
  const treeProject = makeProject({ id: 1, title: 'Merri Creek Tree Planting', categoryId: 'tree-planting', categoryName: 'Tree Planting' })
  const gardenProject = makeProject({ id: 2, title: 'Brunswick Community Garden', categoryId: 'community-garden', categoryName: 'Community Garden' })

  const urbanUser = { id: 10, interests: ['urban-greening'], location: 'Melbourne' }
  const wasteUser = { id: 11, interests: ['waste-reduction'], location: 'Melbourne' }

  const forUrban = getRecommendedProjects(urbanUser, [treeProject, gardenProject])
  const forWaste = getRecommendedProjects(wasteUser, [treeProject, gardenProject])

  assert.equal(forUrban.length, 2, 'should return both projects')
  assert.equal(Number(forUrban[0].project.id), 1, 'urban-greening user should rank tree project first')
  assert.equal(Number(forWaste[0].project.id), 2, 'waste-reduction user should rank garden project first')
  assert.ok(forUrban[0].reasons.some((r) => r.includes('interest')), 'reasons should explain personalisation')
})

test('Innovation #2 — participation history boosts projects in the same category', () => {
  const habitatOpen = makeProject({ id: 5, title: 'Reedbed Restoration', categoryId: 'habitat-restoration', categoryName: 'Habitat Restoration' })
  const treeOpen = makeProject({ id: 6, title: 'Canopy Planting', categoryId: 'tree-planting' })
  const habitatDone = makeProject({ id: 7, title: 'Past Revegetation', categoryId: 'habitat-restoration', categoryName: 'Habitat Restoration' })
  const user = { id: 10, interests: [], location: 'Melbourne' }

  const result = getRecommendedProjects(user, [habitatOpen, treeOpen], {
    joined: [{ ...habitatDone, latitude: habitatOpen.latitude, longitude: habitatOpen.longitude }],
  })

  assert.ok(result.length >= 2, 'both candidates should be returned')
  assert.equal(Number(result[0].project.id), 5, 'same-category as history should rank first via activity')
})

test('Innovation #2 — joined projects are excluded from recommendations', () => {
  const joined = makeProject({ id: 8, title: 'Joined Project', categoryId: 'tree-planting' })
  const other = makeProject({ id: 9, title: 'Open Project', categoryId: 'tree-planting' })
  const user = { id: 10, interests: ['urban-greening'] }
  const result = getRecommendedProjects(user, [joined, other], { joined: [joined] })
  assert.ok(!result.some((c) => Number(c.project.id) === 8), 'already-joined project must not be reccomended')
})

test('Innovation #3 — personal impact summary computed from real data', () => {
  const p1 = makeProject({ id: 1, title: 'A', categoryId: 'tree-planting', status: 'active' })
  const p2 = makeProject({ id: 2, title: 'B', categoryId: 'community-garden', categoryName: 'Community Garden', status: 'completed' })
  const projects = [p1, p2]

  const participation = {
    created: [],
    joined: [
      { ...p1, plantTotal: 120, participation: { joinedAt: '2026-08-01T00:00:00Z' } },
      { ...p2, plantTotal: 40, participation: { joinedAt: '2026-09-01T00:00:00Z' } },
    ],
    ratings: [{ projectId: 1, score: 5, createdAt: '2026-08-05T00:00:00Z' }],
  }

  const impact = getPersonalImpact(1, projects, participation)

  assert.equal(impact.summary.projectsJoined, 2)
  assert.equal(impact.summary.activeParticipations, 1)
  assert.equal(impact.summary.completedProjects, 1)
  assert.equal(impact.summary.categoriesCount, 2)
  assert.equal(impact.summary.ratingsCount, 1)
  assert.equal(impact.summary.averageRatingGiven, 5)
  assert.equal(impact.summary.totalPlants, 160)
  assert.equal(impact.byCategory.length, 2)
  assert.ok(impact.timeline.length >= 2, 'timeline should include join months')
})

test('Innovation #3 — achievements unlock/progress dynamically', () => {
  const joined = [1, 2, 3, 4, 5].map((id) => ({
    ...makeProject({ id, categoryId: 'tree-planting', status: 'active' }),
    plantTotal: 10,
    participation: { joinedAt: '2026-08-01T00:00:00Z' },
  }))
  const impact = getPersonalImpact(1, joined, { created: [], joined, ratings: [] })

  const byId = Object.fromEntries(impact.achievements.map((a) => [a.id, a]))
  assert.equal(byId['first-step'].unlocked, true)
  assert.equal(byId['community-builder'].unlocked, true, '5 joins should unlock Community Builder')
  assert.equal(byId['community-builder'].progress.percent, 100)
  assert.equal(byId['eco-champion'].unlocked, false)
  assert.equal(byId['explorer'].unlocked, false, 'single category should not unlock Explorer')
})

test('E.4 — CSV export escapes values, drops action columns, correct headers', () => {
  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: '_actions', label: 'Actions' },
  ]
  const rows = [{ title: 'Foo "quoted", with comma', status: 'active' }]
  const csv = buildCsv(columns, rows)
  const [header, dataLine] = csv.split('\r\n')
  assert.equal(header, '"Title","Status"', 'action column must be excluded from export')
  assert.equal(dataLine, '"Foo ""quoted"", with comma","active"', 'CSV escaping must double quotes and wrap fields')
})

test('E.4 — dateStamp + formatCell helpers', () => {
  assert.match(dateStamp(new Date('2026-09-09T00:00:00Z')), /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(formatCell({ status: true }, { key: 'status' }), 'Yes')
  assert.equal(formatCell({ score: 5 }, { key: 'score', format: (v) => `${v}/5` }), '5/5')
  assert.equal(formatCell({ missing: null }, { key: 'missing' }), '')
})

test('F.1 #4 — suggested action templates match category and are future-dated', () => {
  const suggestions = getSuggestedActionsForProject({
    categoryId: 'tree-planting',
    categoryName: 'Tree Planting',
    startDate: todayISO(),
  })
  assert.equal(suggestions.length, 5)
  assert.equal(suggestions[0].title, 'Review the native tree species list')
  const dates = suggestions.map((s) => s.dueDate)
  assert.ok(dates.every((d) => d >= todayISO()), 'suggested due dates must not be in the past')
  assert.deepEqual([...dates].sort(), dates, 'due dates must increase with offset')
})

test('F.1 #4 — unknown category falls back to default templates', () => {
  const suggestions = getSuggestedActionsForProject({ categoryId: 'mystery', categoryName: 'Mystery', startDate: null })
  assert.equal(suggestions.length, 5)
  assert.equal(suggestions[0].title, 'Read the project information')
})