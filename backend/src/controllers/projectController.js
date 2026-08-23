const projectService = require('../services/projectService')

async function getProjects(req, res, next) {
  try {
    const { status, categoryId } = req.query
    const projects = await projectService.getProjects({ status, categoryId })
    res.json({ data: projects })
  } catch (error) {
    next(error)
  }
}

async function getProjectById(req, res, next) {
  try {
    const project = await projectService.getProjectById(req.params.id)
    res.json({ data: project })
  } catch (error) {
    next(error)
  }
}

async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject(req.body)
    res.status(201).json({ data: project })
  } catch (error) {
    next(error)
  }
}

async function updateProject(req, res, next) {
  try {
    const project = await projectService.updateProject(req.params.id, req.body)
    res.json({ data: project })
  } catch (error) {
    next(error)
  }
}

async function getParticipation(req, res, next) {
  try {
    const status = await projectService.getParticipationStatus(req.params.id, req.user.id)
    res.json({ data: status })
  } catch (error) {
    next(error)
  }
}

async function joinProject(req, res, next) {
  try {
    const result = await projectService.joinProject(req.params.id, req.user.id)
    res.status(201).json({ data: result })
  } catch (error) {
    next(error)
  }
}

async function leaveProject(req, res, next) {
  try {
    const result = await projectService.leaveProject(req.params.id, req.user.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  getParticipation,
  joinProject,
  leaveProject,
}
