const plantModel = require('../models/plantModel')

const VALID_LEVELS = ['low', 'medium', 'high']

async function getPlants(filters) {
  if (filters.maintenanceLevel && !VALID_LEVELS.includes(filters.maintenanceLevel)) {
    const error = new Error(
      `maintenanceLevel must be one of: ${VALID_LEVELS.join(', ')}`
    )
    error.status = 400
    throw error
  }
  return plantModel.findAll(filters)
}

async function getPlantById(id) {
  if (!Number.isInteger(Number(id))) {
    const error = new Error('Plant id must be a number')
    error.status = 400
    throw error
  }
  const plant = await plantModel.findById(id)
  if (!plant) {
    const error = new Error(`Plant with id ${id} not found`)
    error.status = 404
    throw error
  }
  return plant
}

module.exports = { getPlants, getPlantById }
