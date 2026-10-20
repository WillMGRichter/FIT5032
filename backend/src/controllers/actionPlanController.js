const actionPlanService = require('../services/actionPlanService')

// Returns the signed-in user's actions.
async function getAll(req, res, next) {
  try {
    const actions = await actionPlanService.getUserActions(req.user.id)
    res.json({ data: actions })
  } catch (error) {
    next(error)
  }
}

// Returns actions for a project.
async function getByProject(req, res, next) {
  try {
    const actions = await actionPlanService.getProjectActions(req.user.id, req.params.projectId)
    res.json({ data: actions })
  } catch (error) {
    next(error)
  }
}

// Creates an action.
async function create(req, res, next) {
  try {
    const action = await actionPlanService.createAction({
      ...req.body,
      userId: req.user.id,
    })
    res.status(201).json({ data: action })
  } catch (error) {
    next(error)
  }
}

// Generates suggested project actions.
async function suggest(req, res, next) {
  try {
    const result = await actionPlanService.generateSuggestions({
      projectId: req.body?.projectId,
      userId: req.user.id,
      templates: req.body?.templates,
    })
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

// Updates an action.
async function update(req, res, next) {
  try {
    const action = await actionPlanService.updateAction(
      req.params.actionId,
      req.user.id,
      req.body ?? {},
    )
    res.json({ data: action })
  } catch (error) {
    next(error)
  }
}

// Changes an action's completion state.
async function toggle(req, res, next) {
  try {
    const action = await actionPlanService.toggleAction(req.params.actionId, req.user.id)
    res.json({ data: action })
  } catch (error) {
    next(error)
  }
}

// Deletes an action.
async function remove(req, res, next) {
  try {
    const result = await actionPlanService.deleteAction(req.params.actionId, req.user.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

module.exports = { getAll, getByProject, create, suggest, update, toggle, remove }
