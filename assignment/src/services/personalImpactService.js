const MONTH_LABELS = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
}

function round1(value) {
  return Math.round(value * 10) / 10
}

function monthKey(dateValue) {
  if (!dateValue) return null
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function joinedAtOf(project) {
  return project?.participation?.joinedAt ?? project?.joinedAt ?? null
}

function projectIdentity(project) {
  return Number(project?.id)
}

/**
 * Calculates the current user's personal contribution from real application data.
 * participation: { created, joined, ratings } where created/joined are project rows
 * (status, category, participation.joinedAt, plantTotal) and ratings are the user's
 * own project ratings (score, createdAt, projectId).
 */
export function getPersonalImpact(userId, projects, participation = {}) {
  const projectsById = new Map((Array.isArray(projects) ? projects : []).map((p) => [projectIdentity(p), p]))
  const joined = (participation.joined ?? []).map((project) => {
    const base = projectsById.get(projectIdentity(project))
    return base ? { ...base, ...project, category: project.category ?? base.category } : project
  })
  const created = participation.created ?? []
  const ratings = participation.ratings ?? []

  const activeParticipations = joined.filter((project) => project.status === 'active').length
  const completedProjects = joined.filter((project) => project.status === 'completed').length

  const categories = new Map()
  for (const project of joined) {
    const id = project.category?.id ?? project.categoryId ?? 'unknown'
    const name = project.category?.name ?? 'Unknown category'
    const entry = categories.get(id) ?? { id, name, count: 0 }
    entry.count += 1
    categories.set(id, entry)
  }
  const byCategory = Array.from(categories.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  )

  const months = new Map()
  for (const project of joined) {
    const key = monthKey(joinedAtOf(project))
    if (!key) continue
    months.set(key, (months.get(key) ?? 0) + 1)
  }
  const timeline = Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => ({
      month: key,
      label: MONTH_LABELS[key.slice(5)] ?? key,
      count,
    }))

  const ratingsCount = ratings.length
  const averageRatingGiven =
    ratingsCount > 0 ? round1(ratings.reduce((sum, rating) => sum + Number(rating.score), 0) / ratingsCount) : null

  const totalPlants = joined.reduce((sum, project) => sum + (Number(project.plantTotal) || 0), 0)

  const recentProjects = [...joined]
    .sort((a, b) => {
      const timeA = new Date(joinedAtOf(a) ?? 0).getTime()
      const timeB = new Date(joinedAtOf(b) ?? 0).getTime()
      if (timeA !== timeB) return timeB - timeA
      return projectIdentity(b) - projectIdentity(a)
    })
    .slice(0, 6)

  const summary = {
    projectsJoined: joined.length,
    activeParticipations,
    completedProjects,
    categoriesCount: byCategory.length,
    ratingsCount,
    averageRatingGiven,
    totalPlants,
    projectsCreated: created.length,
  }

  const achievements = buildAchievements(summary)

  return { summary, byCategory, timeline, recentProjects, achievements }
}

function progress(current, target) {
  const capped = Math.min(current, target)
  const percent = target > 0 ? Math.round((capped / target) * 100) : 0
  return { current, target, percent }
}

function buildAchievements(summary) {
  return [
    {
      id: 'first-step',
      title: 'First Step',
      description: 'Join your first project.',
      unlocked: summary.projectsJoined >= 1,
      progress: progress(summary.projectsJoined, 1),
    },
    {
      id: 'community-builder',
      title: 'Community Builder',
      description: 'Join 5 projects.',
      unlocked: summary.projectsJoined >= 5,
      progress: progress(summary.projectsJoined, 5),
    },
    {
      id: 'eco-champion',
      title: 'Eco Champion',
      description: 'Complete 10 projects.',
      unlocked: summary.completedProjects >= 10,
      progress: progress(summary.completedProjects, 10),
    },
    {
      id: 'explorer',
      title: 'Explorer',
      description: 'Participate in 3 different categories.',
      unlocked: summary.categoriesCount >= 3,
      progress: progress(summary.categoriesCount, 3),
    },
    {
      id: 'contributor',
      title: 'Contributor',
      description: 'Submit 5 project ratings.',
      unlocked: summary.ratingsCount >= 5,
      progress: progress(summary.ratingsCount, 5),
    },
  ]
}