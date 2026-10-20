// BR (E.1) Cloud Functions:
// BR (E.2) Geo Location:
// BR (F.1) Innovation:
const INTERESTS = [
  { id: 'urban-greening', label: 'Urban Greening' },
  { id: 'biodiversity', label: 'Biodiversity' },
  { id: 'waste-reduction', label: 'Waste Reduction' },
  { id: 'climate-education', label: 'Climate Education' },
  { id: 'community-action', label: 'Community Action' },
]

const INTEREST_MAP = {
  'urban-greening': {
    labels: ['Urban Greening'],
    categoryIds: ['community-garden', 'green-roof-wall', 'tree-planting'],
    keywords: ['urban', 'greening', 'garden', 'rooftop', 'vertical', 'shade'],
  },
  biodiversity: {
    labels: ['Biodiversity'],
    categoryIds: ['habitat-restoration', 'pollinator-corridor', 'tree-planting', 'waterway-care'],
    keywords: ['biodivers', 'habitat', 'pollinator', 'native', 'species', 'wildlife', 'fauna', 'flora', 'corridor'],
  },
  'waste-reduction': {
    labels: ['Waste Reduction'],
    categoryIds: ['community-garden'],
    keywords: ['waste', 'recycl', 'compost', 'composting', 'food waste'],
  },
  'climate-education': {
    labels: ['Climate Education'],
    categoryIds: [],
    keywords: ['climate', 'education', 'workshop', 'school', 'learn', 'student', 'talk', 'awareness'],
  },
  'community-action': {
    labels: ['Community Action'],
    categoryIds: ['community-garden', 'waterway-care'],
    keywords: ['community', 'volunteer', 'neighbourhood', 'residents', 'people'],
  },
}

const STOPWORDS = new Set(['and', 'the', 'of', 'for', 'a', 'an', 'at', 'in', 'on', 'to', 'park', 'reserve'])
const AVAILABLE_STATUSES = new Set(['planned', 'active'])

// Normalizes text for matching.
function normalize(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim()
}

// Splits normalized text into words.
function wordsOf(text) {
  return normalize(text).split(/\s+/).filter(Boolean)
}

// Calculates distance between two coordinates.
function haversineKm(latA, lngA, latB, lngB) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(latB - latA)
  const dLng = toRad(lngB - lngA)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Gets useful words from a location.
function locationTokens(location) {
  return wordsOf(location).filter((word) => word.length > 3 && !STOPWORDS.has(word))
}

// Counts shared location words.
function sharedTokenCount(a, b) {
  const setB = new Set(b)
  return new Set(a).size === 0 ? 0 : a.reduce((count, token) => (setB.has(token) ? count + 1 : count), 0)
}

// Finds the nearest past project.
function nearestDistanceKm(project, historyProjects) {
  let nearest = null
  for (const prior of historyProjects) {
    if (typeof prior.latitude !== 'number' || typeof prior.longitude !== 'number') continue
    if (typeof project.latitude !== 'number' || typeof project.longitude !== 'number') continue
    const distance = haversineKm(project.latitude, project.longitude, prior.latitude, prior.longitude)
    if (nearest === null || distance < nearest) nearest = distance
  }
  return nearest
}

// Scores project matches to selected interests.
function interestPoints(project, interestIds) {
  let points = 0
  const matched = []
  for (const id of interestIds) {
    const mapping = INTEREST_MAP[id]
    if (!mapping) continue
    if (mapping.categoryIds.includes(project.categoryId)) {
      points += 1.8
      matched.push(...mapping.labels)
      continue
    }
    const haystack = `${project.title} ${project.description} ${project.location} ${project.category?.name ?? ''}`
    const hits = mapping.keywords.filter((keyword) => normalize(haystack).includes(keyword))
    if (hits.length > 0) {
      points += 1.2
      matched.push(...mapping.labels)
    }
  }
  const uniqueLabels = Array.from(new Set(matched))
  return { points: Math.min(points, 2.5), matched: uniqueLabels }
}

// Scores categories from past projects.
function categoryMatchPoints(project, history) {
  const sameCategory = history.filter((p) => p.categoryId === project.categoryId)
  if (sameCategory.length === 0) return { points: 0, count: 0 }
  return { points: Math.min(2, 0.75 + 0.35 * (sameCategory.length - 1)), count: sameCategory.length }
}

// Scores projects near past participation.
function participationSimilarityPoints(project, history) {
  const nearest = nearestDistanceKm(project, history)
  if (nearest === null) return { points: 0, km: null, title: null }
  if (nearest <= 5) return { points: 1.5, km: nearest, title: null }
  if (nearest <= 20) return { points: 1.0, km: nearest, title: null }
  if (nearest <= 50) return { points: 0.5, km: nearest, title: null }
  return { points: 0, km: nearest, title: null }
}

// Scores a match to the user's location.
function locationRelevancePoints(project, userLocation) {
  if (!userLocation) return { points: 0, matched: false }
  const projectTokens = locationTokens(project.location)
  const userTokens = locationTokens(userLocation)
  const shared = sharedTokenCount(projectTokens, userTokens)
  return { points: shared > 0 ? 0.75 : 0, matched: shared > 0 }
}

// Scores project ratings.
function qualityPoints(project) {
  const avg = Number(project.avgRating) || 0
  const count = Number(project.ratingCount) || 0
  if (count === 0) return { points: 0.1, avg: null, count: 0 }
  const confidence = Math.min(count, 5) / 5
  return { points: Math.min(1, (avg / 5) * (0.5 + 0.5 * confidence)), avg, count }
}

// Scores project availability.
function availabilityPoints(project) {
  if (project.status === 'active') return { points: 1, label: 'Active — open for participants' }
  if (project.status === 'planned') return { points: 0.9, label: 'Planned — joining soon' }
  if (project.status === 'completed') return { points: 0.4, label: 'Completed — read what volunteers achieved' }
  return { points: 0, label: null }
}

// Rounds a score to one decimal place.
function round1(value) {
  return Math.round(value * 10) / 10
}

// Builds the reasons shown with a recommendation.
function buildReasons(result) {
  const reasons = []
  if (result.interest.matched.length > 0) {
    reasons.push(
      `Matches your interest${result.interest.matched.length > 1 ? 's' : ''} in ${result.interest.matched.join(', ')}.`,
    )
  }
  if (result.category.count > 0) {
    reasons.push(
      `You've participated in ${result.category.count} ${result.project.category?.name ?? 'similar'} project${result.category.count === 1 ? '' : 's'} before.`,
    )
  }
  if (result.location.matchedAndClose) {
    reasons.push(`Close to ${result.location.userLocation}, where you've told us you are based.`)
  } else if (result.location.matched) {
    reasons.push(`Near your listed location: ${result.location.userLocation}.`)
  }
  if (result.quality.avg !== null) {
    reasons.push(`Rated ${result.quality.avg} out of 5 by volunteers.`)
  }
  if (result.availability.label) {
    reasons.push(result.availability.label + '.')
  }
  return reasons
}

// Scores a project using the user's history and interests.
function personalizedScore(project, ctx) {
  const interest = interestPoints(project, ctx.interestIds)
  const category = categoryMatchPoints(project, ctx.history)
  const participation = participationSimilarityPoints(project, ctx.history)
  const location = locationRelevancePoints(project, ctx.userLocation)
  const quality = qualityPoints(project)
  const availability = availabilityPoints(project)

  // Limit location's scoring influence.
  const locationPoints = Math.min(1.5, participation.points + location.points)
  const score = round1(
    interest.points + category.points + locationPoints + quality.points + availability.points,
  )

  return {
    project,
    score,
    causes: {
      interest: interest.matched,
      categoryCount: category.count,
      proximityKm: participation.km,
      userLocationMatched: location.matched,
      quality,
      availability: availability.label,
    },
    reasons: buildReasons({
      project,
      interest,
      category,
      location: { ...location, userLocation: ctx.userLocation, matchedAndClose: location.points > 0 },
      quality,
      availability,
    }),
  }
}

// Scores projects when personal history is unavailable.
function fallbackScore(project) {
  const avg = Number(project.avgRating) || 0
  const count = Number(project.ratingCount) || 0
  const volunteers = Number(project.volunteerCount) || 0
  const capacity = Number(project.capacity) || 1
  const fillRatio = Math.min(volunteers / capacity, 1)

  const reasons = []

  const quality = avg > 0 ? Math.min(1.5, (avg / 5) * (0.6 + (0.4 * Math.min(count, 5)) / 5)) : 0
  if (count > 0) reasons.push(`Highly rated at ${avg} out of 5.`)

  const activity = project.status === 'active' ? 1.4 : project.status === 'planned' ? 1.1 : project.status === 'completed' ? 0.5 : 0
  if (AVAILABLE_STATUSES.has(project.status)) {
    reasons.push(
      project.status === 'active' ? 'Currently active and open for participants.' : 'Planned — join before it kicks off.',
    )
  }

  const popularity = fillRatio * 1.3
  if (fillRatio >= 0.6) reasons.push(`Popular — ${volunteers} of ${capacity} spots filled.`)

  if (reasons.length === 0) {
    reasons.push('A GreenLink project that fits the community\u2019s current focus.')
  }

  return {
    project,
    score: round1(quality + activity + popularity),
    reasons,
  }
}

// Orders recommendations by score and project ID.
function sortKey(a, b) {
  if (a.score !== b.score) return b.score - a.score
  return a.project.id - b.project.id
}

// Builds ranked recommendations for one user.
function buildRecommendations(user, projects, participation = {}, options = {}) {
  const limit = options.limit ?? 5
  const all = Array.isArray(projects) ? projects : []
  const container = all.map((project) => ({
    ...project,
    latitude: Number(project.latitude),
    longitude: Number(project.longitude),
  }))
  const active = container.filter(
    (project) => project.status !== 'cancelled' && (project.volunteerCount ?? 0) < (project.capacity ?? Infinity),
  )

  const joined = Array.isArray(participation.joined) ? participation.joined : []
  const created = Array.isArray(participation.created) ? participation.created : []
  const joinedIds = new Set(joined.map((p) => Number(p.id)))
  const history = [...created, ...joined].map((p) => ({
    ...p,
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
  }))
  const interestIds = Array.isArray(user && user.interests) ? user.interests.filter(Boolean) : []
  const userLocation =
    user && typeof user.location === 'string' && user.location.trim() ? user.location.trim() : null

  const candidates = active.filter((project) => !joinedIds.has(Number(project.id)))
  const hasPersonalisation = interestIds.length > 0 || history.length > 0

  let scored
  if (hasPersonalisation) {
    const ctx = { interestIds, history, userLocation }
    // Filter out weak personal matches.
    scored = candidates
      .map((project) => personalizedScore(project, ctx))
      .filter((item) => item.score >= 1.9 || item.causes.categoryCount > 0 || item.causes.interest.length > 0)
      .sort(sortKey)
      .slice(0, limit)
  } else {
    scored = []
  }

  const usedIds = new Set(scored.map((item) => Number(item.project.id)))
  if (scored.length < limit) {
    const fillers = candidates
      .filter((project) => !usedIds.has(Number(project.id)))
      .map((project) => fallbackScore(project))
      .sort(sortKey)

    for (const filler of fillers) {
      if (scored.length >= limit) break
      if (scored.length === 0) {
        scored.push(filler)
      } else {
        scored.push({ ...filler, reasons: [...filler.reasons, 'Also a popular, well-rated option.'] })
      }
      usedIds.add(Number(filler.project.id))
    }
  }

  return scored
}

// Converts a project database row for scoring.
function mapProjectRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    category: row.category_name ? { id: row.category_id, name: row.category_name } : undefined,
    location: row.location,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    image: row.image,
    startDate: row.start_date,
    endDate: row.end_date,
    capacity: row.capacity,
    status: row.status,
    volunteerCount: row.volunteer_count != null ? Number(row.volunteer_count) : 0,
    avgRating: row.avg_rating != null ? Number(row.avg_rating) : 0,
    ratingCount: row.rating_count != null ? Number(row.rating_count) : 0,
  }
}

// Converts participation history for scoring.
function mapHistoryRow(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }
}

// Loads a user's data and builds recommendations.
async function getRecommendationsForUser({ query, uid, limit = 5 } = {}) {
  if (typeof query !== 'function') throw new Error('getRecommendationsForUser requires a query function')
  if (!uid) return []

  const userResult = await query(
    'SELECT id, interests, location FROM users WHERE firebase_uid = $1',
    [uid],
  )
  if (!userResult.rows.length) return []

  const dbUser = userResult.rows[0]
  const user = { interests: dbUser.interests || [], location: dbUser.location }

  const { rows } = await query(
    `SELECT p.id, p.title, p.description, p.category_id, c.name AS category_name,
            p.location, p.latitude, p.longitude, p.image, p.start_date, p.end_date,
            p.capacity, p.status,
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
       ) r ON r.project_id = p.id`,
  )
  const projects = rows.map(mapProjectRow)

  const joinedResult = await query(
    `SELECT p.id, p.category_id, p.latitude, p.longitude
       FROM project_participations pp
       JOIN projects p ON p.id = pp.project_id
      WHERE pp.user_id = $1`,
    [dbUser.id],
  )
  const createdResult = await query(
    'SELECT id, category_id, latitude, longitude FROM projects WHERE created_by = $1',
    [dbUser.id],
  )

  const participation = {
    joined: joinedResult.rows.map(mapHistoryRow),
    created: createdResult.rows.map(mapHistoryRow),
  }

  return buildRecommendations(user, projects, participation, { limit })
}

module.exports = {
  INTERESTS,
  INTEREST_MAP,
  buildRecommendations,
  getRecommendationsForUser,
}
