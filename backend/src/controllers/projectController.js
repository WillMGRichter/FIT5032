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

module.exports = { getProjects, getProjectById }
