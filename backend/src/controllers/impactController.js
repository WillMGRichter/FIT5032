const impactService = require('../services/impactService')

async function getOverview(req, res, next) {
  try {
    const data = await impactService.getOverview(req.query)
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

module.exports = { getOverview }