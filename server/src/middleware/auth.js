import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { verifyAccessToken } from '../utils/token.js'

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
  const user = await User.findById(decoded.id).select('-passwordHash')
  if (!user) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' })
  }

  req.user = user
  next()
})
