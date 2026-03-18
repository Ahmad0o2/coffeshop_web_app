import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { generateToken } from '../utils/token.js'
import { loginSchema, registerSchema } from '../validators/auth.js'

const sanitizeUser = (user) => ({
  id: user._id,
  role: user.role,
  fullName: user.fullName,
  email: user.email,
  username: user.username,
  phone: user.phone,
  languagePreference: user.languagePreference,
  loyaltyPoints: user.loyaltyPoints,
  permissions: user.permissions || [],
})

const normalizeEmail = (value) =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined

const normalizePhone = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

export const register = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body)
  const fullName = payload.fullName.trim()
  const password = payload.password
  const email = normalizeEmail(payload.email)
  const phone = normalizePhone(payload.phone)

  const [existingByEmail, existingByPhone] = await Promise.all([
    email ? User.findOne({ email }).select('_id role') : null,
    phone ? User.findOne({ phone }).select('_id role') : null,
  ])

  if (existingByEmail && existingByPhone) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: 'Email and phone are already in use.',
      fields: ['email', 'phone'],
    })
  }

  if (existingByEmail) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: 'Email is already in use.',
      fields: ['email'],
    })
  }

  if (existingByPhone) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: 'Phone is already in use.',
      fields: ['phone'],
    })
  }

  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)

  let user
  try {
    user = await User.create({
      fullName,
      email,
      phone,
      passwordHash,
    })
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0]
      if (duplicateField === 'email') {
        return res.status(409).json({
          code: 'CONFLICT',
          message: 'Email is already in use.',
          fields: ['email'],
        })
      }
      if (duplicateField === 'phone') {
        return res.status(409).json({
          code: 'CONFLICT',
          message: 'Phone is already in use.',
          fields: ['phone'],
        })
      }
      if (duplicateField === 'username') {
        return res.status(409).json({
          code: 'CONFLICT',
          message: 'Username is already in use.',
          fields: ['username'],
        })
      }
      return res.status(409).json({
        code: 'CONFLICT',
        message: 'A user with these details already exists.',
      })
    }
    throw error
  }

  const token = generateToken(user._id)
  res.status(201).json({ user: sanitizeUser(user), token })
})

export const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body)
  const { phone, password } = payload
  const identifier = payload.identifier || payload.username || payload.email
  const normalizedIdentifier = identifier
    ? identifier.trim().toLowerCase()
    : undefined

  const loginFilters = []
  if (normalizedIdentifier) {
    loginFilters.push({ email: normalizedIdentifier })
    loginFilters.push({ username: normalizedIdentifier })
  }
  if (phone) loginFilters.push({ phone })
  const user = await User.findOne({ $or: loginFilters })
  if (!user) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid login' })
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid login' })
  }

  const token = generateToken(user._id)
  res.json({ user: sanitizeUser(user), token })
})

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: req.user })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, languagePreference } = req.body

  const user = await User.findById(req.user._id)
  if (!user) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' })
  }

  if (fullName) user.fullName = fullName
  if (phone) user.phone = phone
  if (languagePreference) user.languagePreference = languagePreference

  await user.save()
  res.json({ user: sanitizeUser(user) })
})
