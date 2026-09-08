export const INTERESTS = [
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

function normalize(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim()
}

function wordsOf(text) {
  return normalize(text).split(/\s+/).filter(Boolean)
}

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

function locationTokens(location) {
  return wordsOf(location).filter((word) => word.length > 3 && !STOPWORDS.has(word))
}

function sharedTokenCount(a, b) {
  const setB = new Set(b)
  return new Set(a).size === 0 ? 0 : a.reduce((count, token) => (setB.has(token) ? count + 1 : count), 0)
}

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

function categoryMatchPoints(project, history) {
  const sameCategory = history.filter((p) => p.categoryId === project.categoryId)
  if (sameCategory.length === 0) return { points: 0, count: 0 }
  return { points: Math.min(2, 0.75 + 0.35 * (sameCategory.length - 1)), count: sameCategory.length }
}

function participationSimilarityPoints(project, history) {
  const nearest = nearestDistanceKm(project, history)
  if (nearest === null) return { points: 0, km: null, title: null }
  if (nearest <= 5) return { points: 1.5, km: nearest, title: null }
  if (nearest <= 20) return { points: 1.0, km: nearest, title: null }
  if (nearest <= 50) return { points: 0.5, km: nearest, title: null }
  return { points: 0, km: nearest, title: null }
}

function locationRelevancePoints(project, userLocation) {
  if (!userLocation) return { points: 0, matched: false }
  const projectTokens = locationTokens(project.location)
  const userTokens = locationTokens(userLocation)
  const shared = sharedTokenCount(projectTokens, userTokens)
  return { points: shared > 0 ? 0.75 : 0, matched: shared > 0 }
}

function qualityPoints(project) {
  const avg = Number(project.avgRating) || 0
  const count = Number(project.ratingCount) || 0
  if (count === 0) return { points: 0.1, avg: null, count: 0 }
  const confidence = Math.min(count, 5) / 5
  return { points: Math.min(1, (avg / 5) * (0.5 + 0.5 * confidence)), avg, count }
}

function availabilityPoints(project) {
  if (project.status === 'active') return { points: 1, label: 'Active — open for participants' }
  if (project.status === 'planned') return { points: 0.9, label: 'Planned — joining soon' }
  if (project.status === 'completed') return { points: 0.4, label: 'Completed — read what volunteers achieved' }
  return { points: 0, label: null }
}

function round1(value) {
  return Math.round(value * 10) / 10
}

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

function personalizedScore(project, ctx) {
  const interest = interestPoints(project, ctx.interestIds)
  const category = categoryMatchPoints(project, ctx.history)
  const participation = participationSimilarityPoints(project, ctx.history)
  const location = locationRelevancePoints(project, ctx.userLocation)
  const quality = qualityPoints(project)
  const availability = availabilityPoints(project)

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
      quality: quality,
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

function fallbackScore(project) {
  const avg = Number(project.avgRating) || 0
  const count = Number(project.ratingCount) || 0
  const volunteers = Number(project.volunteerCount) || 0
  const capacity = Number(project.capacity) || 1
  const fillRatio = Math.min(volunteers / capacity, 1)

  const reasons = []

  const quality = avg > 0 ? Math.min(1.5, (avg / 5) * (0.6 + 0.4 * Math.min(count, 5) / 5)) : 0
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

function sortKey(a, b) {
  if (a.score !== b.score) return b.score - a.score
  return a.project.id - b.project.id
}

/**
 * Rule-based, deterministic recommendations.
 * returns [{ project, score, reasons }]
 */
export function getRecommendedProjects(user, projects, participation = {}, options = {}) {
  const limit = options.limit ?? 5
  const all = Array.isArray(projects) ? projects : []
  const container = all.map((project) => ({ ...project, latitude: Number(project.latitude), longitude: Number(project.longitude) }))
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
  const interestIds = Array.isArray(user?.interests) ? user.interests.filter(Boolean) : []
  const userLocation = typeof user?.location === 'string' && user.location.trim() ? user.location.trim() : null

  const candidates = active.filter((project) => !joinedIds.has(Number(project.id)))
  const hasPersonalisation = interestIds.length > 0 || history.length > 0

  let scored
  if (hasPersonalisation) {
    const ctx = { interestIds, history, userLocation }
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