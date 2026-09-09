const actionPlanService = require('../services/actionPlanService')

async function getAll(req, res, next) {
  try {
    const actions = await actionPlanService.getUserActions(req.user.id)
    res.json({ data: actions })
  } catch (error) {
    next(error)
  }
}

async function getByProject(req, res, next) {
  try {
    const actions = await actionPlanService.getProjectActions(req.user.id, req.params.projectId)
    res.json({ data: actions })
  } catch (error) {
    next(error)
  }
}

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

async function toggle(req, res, next) {
  try {
    const action = await actionPlanService.toggleAction(req.params.actionId, req.user.id)
    res.json({ data: action })
  } catch (error) {
    next(error)
  }
}

async function remove(req, res, next) {
  try {
    const result = await actionPlanService.deleteAction(req.params.actionId, req.user.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

module.exports = { getAll, getByProject, create, suggest, update, toggle, remove }