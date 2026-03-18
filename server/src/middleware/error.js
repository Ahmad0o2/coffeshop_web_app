export const notFound = (req, res, next) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' })
}

export const errorHandler = (err, req, res, next) => {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.issues,
    })
  }

  const status = err.statusCode || 500
  res.status(status).json({
    code: err.code || 'SERVER_ERROR',
    message: err.message || 'Server error',
  })
}
