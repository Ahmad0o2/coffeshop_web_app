import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { verifyAccessToken } from '../utils/token.js'

const buildTokenBackedUser = (decoded) => ({
  _id: decoded.id,
  id: decoded.id,
  role: decoded.role || 'Customer',
  permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
})

const shouldHydrateUserFromDb = (req, decoded) => {
  if (!decoded?.role || !Array.isArray(decoded.permissions)) {
    return true
  }

  if (req.method !== 'GET') {
    return true
  }

  if (req.originalUrl.startsWith('/api/v1/admin')) {
    return true
  }

  if (
    req.originalUrl.startsWith('/api/v1/orders') &&
    decoded.role &&
    decoded.role !== 'Customer'
  ) {
    return true
  }

  if (req.originalUrl.startsWith('/api/v1/auth/profile')) {
    return true
  }

  return false
}

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null

  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'No token' })
  }

  let decoded
  try {
    decoded = verifyAccessToken(token)
  } catch {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' })
  }

  if (!shouldHydrateUserFromDb(req, decoded)) {
    req.user = buildTokenBackedUser(decoded)
    next()
    return
  }

  const user = await User.findById(decoded.id).select('-passwordHash')
  if (!user) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' })
  }

  req.user = user
  next()
})
