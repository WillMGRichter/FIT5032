const categoryService = require('../services/categoryService')

async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategories()
    res.json({ data: categories })
  } catch (error) {
    next(error)
  }
}

async function getCategoryById(req, res, next) {
  try {
    const category = await categoryService.getCategoryById(req.params.id)
    res.json({ data: category })
  } catch (error) {
    next(error)
  }
}

module.exports = { getCategories, getCategoryById }
