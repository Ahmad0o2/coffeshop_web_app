import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import AuthOtp from '../models/AuthOtp.js'
import User from '../models/User.js'
import { sendBrevoTransactionalEmail } from '../services/brevoEmail.js'
import asyncHandler from '../utils/asyncHandler.js'
import { generateToken } from '../utils/token.js'
import {
  loginSchema,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
} from '../validators/auth.js'

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

const OTP_EXPIRY_MINUTES = 10
const MAX_OTP_ATTEMPTS = 5

const createOtpCode = () => String(crypto.randomInt(100000, 1000000))

const createOtpMessage = (purpose) =>
  purpose === 'register'
    ? 'Verification code created for email sign-up.'
    : 'Password reset code created for this email address.'

const createOtpEmailContent = ({ code, purpose }) => {
  const heading =
    purpose === 'register' ? 'Confirm your email address' : 'Reset your password'
  const intro =
    purpose === 'register'
      ? 'Use this one-time code to finish creating your Cortina.D account.'
      : 'Use this one-time code to reset your Cortina.D password.'

  return {
    subject:
      purpose === 'register'
        ? 'Your Cortina.D sign-up code'
        : 'Your Cortina.D password reset code',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1b1715;">
        <h2 style="margin: 0 0 12px;">${heading}</h2>
        <p style="margin: 0 0 16px; line-height: 1.7;">${intro}</p>
        <div style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #f2dd9b; font-size: 24px; font-weight: 700; letter-spacing: 0.24em;">
          ${code}
        </div>
        <p style="margin: 16px 0 0; line-height: 1.7;">
          This code expires in ${OTP_EXPIRY_MINUTES} minutes.
        </p>
      </div>
    `,
    textContent: `${heading}\n\n${intro}\n\nCode: ${code}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  }
}

const sendOtp = async ({ email, purpose, code }) => {
  const content = createOtpEmailContent({ code, purpose })

  try {
    const result = await sendBrevoTransactionalEmail({
      to: email,
      subject: content.subject,
      htmlContent: content.htmlContent,
      textContent: content.textContent,
    })

    if (result.delivered) {
      return {
        deliveryMode: 'email',
      }
    }
  } catch (error) {
    console.error(
      `[OTP:${purpose}] Brevo delivery failed for ${email}. Falling back to demo mode.`,
      error?.details || error?.message || error
    )
  }

  console.log(`[OTP:${purpose}] ${email} -> ${code}`)
  return {
    deliveryMode: 'demo',
    demoCode: code,
    note: 'Brevo is not fully configured yet. Showing the code in demo mode.',
  }
}

const consumeOtp = async ({ email, purpose, otpCode }) => {
  const record = await AuthOtp.findOne({
    email,
    purpose,
    consumedAt: null,
  }).sort({ createdAt: -1 })

  if (!record || record.expiresAt.getTime() < Date.now()) {
    if (record) {
      await AuthOtp.deleteOne({ _id: record._id })
    }
    return {
      ok: false,
      status: 400,
      message: 'This verification code has expired. Please request a new one.',
    }
  }

  const nextAttempts = Number(record.attempts || 0) + 1
  const isMatch = record.codeHash === AuthOtp.hashCode(otpCode)

  if (!isMatch) {
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await AuthOtp.deleteOne({ _id: record._id })
      return {
        ok: false,
        status: 400,
        message: 'Too many incorrect codes. Please request a new one.',
      }
    }

    record.attempts = nextAttempts
    await record.save()
    return {
      ok: false,
      status: 400,
      message: 'The verification code is incorrect.',
    }
  }

  record.attempts = nextAttempts
  record.consumedAt = new Date()
  await record.save()

  return { ok: true }
}

export const requestOtp = asyncHandler(async (req, res) => {
  const payload = requestOtpSchema.parse(req.body)
  const email = normalizeEmail(payload.email)
  const purpose = payload.purpose

  if (purpose === 'register') {
    const existingUser = await User.findOne({ email }).select('_id')
    if (existingUser) {
      return res.status(409).json({
        code: 'CONFLICT',
        message: 'Email is already in use.',
        fields: ['email'],
      })
    }
  }

  if (purpose === 'reset-password') {
    const existingUser = await User.findOne({ email }).select('_id')
    if (!existingUser) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'We could not find an account with that email address.',
        fields: ['email'],
      })
    }
  }

  await AuthOtp.deleteMany({ email, purpose, consumedAt: null })

  const code = createOtpCode()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  await AuthOtp.create({
    email,
    purpose,
    codeHash: AuthOtp.hashCode(code),
    expiresAt,
  })

  const delivery = await sendOtp({ email, purpose, code })

  res.json({
    message: createOtpMessage(purpose),
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    deliveryMode: delivery.deliveryMode,
    demoCode: delivery.demoCode,
    note: delivery.note,
  })
})

export const register = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body)
  const fullName = payload.fullName.trim()
  const password = payload.password
  const email = normalizeEmail(payload.email)
  const phone = normalizePhone(payload.phone)
  const otpCode = payload.otpCode

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

  const otpResult = await consumeOtp({ email, purpose: 'register', otpCode })
  if (!otpResult.ok) {
    return res.status(otpResult.status).json({
      code: 'OTP_INVALID',
      message: otpResult.message,
      fields: ['otpCode'],
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
  const trimmedIdentifier = identifier ? identifier.trim() : undefined
  const normalizedIdentifier = trimmedIdentifier ? trimmedIdentifier.toLowerCase() : undefined

  const loginFilters = []
  if (normalizedIdentifier) {
    loginFilters.push({ email: normalizedIdentifier })
    loginFilters.push({ username: normalizedIdentifier })
  }
  if (trimmedIdentifier) loginFilters.push({ phone: trimmedIdentifier })
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

export const resetPassword = asyncHandler(async (req, res) => {
  const payload = resetPasswordSchema.parse(req.body)
  const email = normalizeEmail(payload.email)
  const otpCode = payload.otpCode
  const newPassword = payload.newPassword

  const user = await User.findOne({ email })
  if (!user) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'We could not find an account with that email address.',
      fields: ['email'],
    })
  }

  const otpResult = await consumeOtp({
    email,
    purpose: 'reset-password',
    otpCode,
  })
  if (!otpResult.ok) {
    return res.status(otpResult.status).json({
      code: 'OTP_INVALID',
      message: otpResult.message,
      fields: ['otpCode'],
    })
  }

  const salt = await bcrypt.genSalt(10)
  user.passwordHash = await bcrypt.hash(newPassword, salt)
  await user.save()

  res.json({
    message: 'Password reset successful. You can sign in with the new password now.',
  })
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
