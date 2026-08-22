const categoryModel = require('../models/categoryModel')

async function getCategories() {
  return categoryModel.findAll()
}

async function getCategoryById(id) {
  const category = await categoryModel.findById(id)
  if (!category) {
    const error = new Error(`Category with id ${id} not found`)
    error.status = 404
    throw error
  }
  return category
}

module.exports = { getCategories, getCategoryById }
