function toISODate(value) {
  if (!value) return null
  const iso = value.length === 10 ? `${value}T00:00:00Z` : value
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function anchorDate(projectStartDate) {
  const start = toISODate(projectStartDate)
  const today = todayISO()
  if (!start) return today
  return start > today ? start : today
}

const KEYWORD_MAP = [
  ['tree-planting', 'tree planting', 'tree', 'canopy'],
  ['community-garden', 'community garden', 'garden'],
  ['habitat-restoration', 'habitat restoration', 'habitat', 'restoration'],
  ['pollinator-corridor', 'pollinator corridor', 'pollinator', 'bee', 'butterfly'],
  ['waterway-care', 'waterway care', 'waterway', 'creek', 'wetland'],
  ['green-roof-wall', 'green roof', 'green wall', 'roof', 'wall'],
]

function matchKey(project) {
  const id = String(project?.categoryId ?? '').toLowerCase()
  const name = String(project?.categoryName ?? project?.category?.name ?? '').toLowerCase()

  for (const [key, ...words] of KEYWORD_MAP) {
    if (key === id) return key
    if (words.some((word) => name.includes(word))) return key
  }
  return 'default'
}

const TEMPLATES = {
  'tree-planting': [
    { title: 'Review the native tree species list', description: 'Read which trees will be planted and how each supports the urban canopy.', offset: 1 },
    { title: 'Confirm attendance for the planting session', description: 'Let the project organiser know you can make the planting day.', offset: 2 },
    { title: 'Pack gloves and planting tools', description: 'Bring gloves, a trowel and sturdy closed-toe shoes.', offset: 3 },
    { title: 'Attend the planting activity', description: 'Help plant and establish the trees for this project.', offset: 7 },
    { title: 'Submit project feedback', description: 'Share how the planting day went once it is complete.', offset: 14 },
  ],
  'community-garden': [
    { title: 'Review the garden growing guidelines', description: 'Read how the community garden manages food and native plantings.', offset: 1 },
    { title: 'Confirm attendance for the garden work session', description: 'Let the organiser know you can make the session.', offset: 2 },
    { title: 'Prepare gloves, a trowel and a watering can', description: 'Bring basic hand tools and water for the workday.', offset: 3 },
    { title: 'Attend the garden work session', description: 'Help maintain the shared garden beds.', offset: 7 },
    { title: 'Submit garden feedback', description: 'Share how the gardening session went when complete.', offset: 14 },
  ],
  'habitat-restoration': [
    { title: 'Review the revegetation guidelines', description: 'Read the planting and aftercare information before the restoration day.', offset: 1 },
    { title: 'Confirm attendance for the restoration day', description: 'Let the organiser know you can attend.', offset: 2 },
    { title: 'Pack gloves and weed-removal tools', description: 'Bring gloves, a mattock or trowel and sturdy footwear.', offset: 3 },
    { title: 'Attend the habitat restoration activity', description: 'Help restore the indigenous understorey.', offset: 7 },
    { title: 'Submit restoration feedback', description: 'Share how the restoration session went once it is complete.', offset: 14 },
  ],
  'pollinator-corridor': [
    { title: 'Read the pollinator planting guidelines', description: 'Learn how nectar-rich plantings support bees, butterflies and honeyeaters.', offset: 1 },
    { title: 'Confirm attendance for the corridor planting', description: 'Let the organiser know you can make the planting session.', offset: 2 },
    { title: 'Pack gloves and planting tools', description: 'Bring gloves, a trowel and sturdy shoes.', offset: 3 },
    { title: 'Attend the pollinator corridor planting', description: 'Help connect habitat patches for pollinators.', offset: 7 },
    { title: 'Submit corridor feedback', description: 'Share how the planting session went once it is complete.', offset: 14 },
  ],
  'waterway-care': [
    { title: 'Read the waterway safety and care information', description: 'Review the health and environmental safety guidance for creek and river sites.', offset: 1 },
    { title: 'Confirm attendance for the waterway session', description: 'Let the organiser know you can attend.', offset: 2 },
    { title: 'Pack boots, gloves and a rubbish bag', description: 'Bring protective footwear and collection equipment.', offset: 3 },
    { title: 'Attend the waterway care activity', description: 'Help protect and revegetate the creek or wetland site.', offset: 7 },
    { title: 'Submit waterway feedback', description: 'Share how the care session went once it is complete.', offset: 14 },
  ],
  'green-roof-wall': [
    { title: 'Review the green roof or wall installation guidelines', description: 'Understand how the living infrastructure is being installed.', offset: 1 },
    { title: 'Confirm attendance for the build day', description: 'Let the organiser know you can make the installation day.', offset: 2 },
    { title: 'Pack gloves and closed-toe shoes', description: 'Bring protective gear for the installation.', offset: 3 },
    { title: 'Attend the living infrastructure build session', description: 'Help install the green roof or wall system.', offset: 7 },
    { title: 'Submit build feedback', description: 'Share how the installation went once it is complete.', offset: 14 },
  ],
  default: [
    { title: 'Read the project information', description: 'Review the project details and what the activity involves.', offset: 1 },
    { title: 'Confirm attendance for the project activity', description: 'Let the organiser know you can make the activity.', offset: 2 },
    { title: 'Prepare required equipment and clothing', description: 'Bring anything recommended in the project description.', offset: 3 },
    { title: 'Attend the project activity', description: 'Take part in the activity.', offset: 7 },
    { title: 'Submit project feedback', description: 'Share how the activity went once it is complete.', offset: 14 },
  ],
}

export function getSuggestedActionsForProject(project) {
  const key = matchKey(project)
  const templates = TEMPLATES[key] ?? TEMPLATES.default
  const base = anchorDate(project?.startDate ?? project?.startDate)

  return templates.map(({ title, description, offset }) => ({
    title,
    description,
    dueDate: addDays(base, offset),
  }))
}