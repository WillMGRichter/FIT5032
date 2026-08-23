function errorHandler(error, req, res, next) {
  const status = error.status || 500
  const message = status === 500 ? 'Internal server error' : error.message

  if (status === 500) {
    console.error(error)
  }

  const body = { error: message }
  if (error.details && typeof error.details === 'object') {
    body.errors = error.details
  }

  res.status(status).json(body)
}

module.exports = errorHandler
