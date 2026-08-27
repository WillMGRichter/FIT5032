const plantService = require('../services/plantService')

async function getPlants(req, res, next) {
  try {
    const { maintenanceLevel } = req.query
    const plants = await plantService.getPlants({ maintenanceLevel })
    res.json({ data: plants })
  } catch (error) {
    next(error)
  }
}

async function getPlantById(req, res, next) {
  try {
    const plant = await plantService.getPlantById(req.params.id)
    res.json({ data: plant })
  } catch (error) {
    next(error)
  }
}

async function getProjectsByPlant(req, res, next) {
  try {
    const projects = await plantService.getProjectsByPlant(req.params.id)
    res.json({ data: projects })
  } catch (error) {
    next(error)
  }
}

module.exports = { getPlants, getPlantById, getProjectsByPlant }
