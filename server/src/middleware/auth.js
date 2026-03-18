import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null

  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'No token' })
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res
      .status(500)
      .json({ code: 'SERVER_ERROR', message: 'JWT secret missing' })
  }

  const decoded = jwt.verify(token, secret)
  const user = await User.findById(decoded.id).select('-passwordHash')
  if (!user) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' })
  }

  req.user = user
  next()
})
