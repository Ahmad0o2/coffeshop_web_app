import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import AuthOtp from '../models/AuthOtp.js'
import RefreshToken from '../models/RefreshToken.js'
import User from '../models/User.js'
import { sendBrevoTransactionalEmail } from '../services/brevoEmail.js'
import asyncHandler from '../utils/asyncHandler.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js'
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
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
const REFRESH_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || 'cortina_refresh_token'

const createOtpCode = () => String(crypto.randomInt(100000, 1000000))
const createRefreshTokenId = () => crypto.randomUUID()

const getRefreshTokenTtlValue = () => process.env.REFRESH_TOKEN_TTL || '30d'

const getDurationFromTtl = (ttl) => {
  const match = ttl.match(/^(\d+)([smhd])$/)

  if (!match) {
    return 30 * 24 * 60 * 60 * 1000
  }

  const [, rawAmount, unit] = match
  const amount = Number(rawAmount)
  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return amount * unitMap[unit]
}

const getRefreshTokenExpiryDate = () =>
  new Date(Date.now() + getDurationFromTtl(getRefreshTokenTtlValue()))

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure:
    process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  path: '/api/v1/auth',
  maxAge: getDurationFromTtl(getRefreshTokenTtlValue()),
})

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
}

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  })
}

const parseCookies = (cookieHeader = '') =>
  cookieHeader.split(';').reduce((accumulator, cookiePart) => {
    const [rawKey, ...rawValueParts] = cookiePart.trim().split('=')
    if (!rawKey || rawValueParts.length === 0) return accumulator

    accumulator[rawKey] = decodeURIComponent(rawValueParts.join('='))
    return accumulator
  }, {})

const getRefreshTokenFromRequest = (req) =>
  parseCookies(req.headers.cookie || '')[REFRESH_COOKIE_NAME] || ''

const createAuthPayload = async (
  user,
  res,
  { previousTokenRecord = null } = {}
) => {
  const tokenId = createRefreshTokenId()
  const accessToken = generateAccessToken(user._id)
  const refreshToken = generateRefreshToken(user._id, tokenId)

  await RefreshToken.create({
    userId: user._id,
    tokenId,
    tokenHash: RefreshToken.hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
  })

  if (previousTokenRecord) {
    previousTokenRecord.revokedAt = new Date()
    previousTokenRecord.replacedByTokenId = tokenId
    await previousTokenRecord.save()
  }

  setRefreshTokenCookie(res, refreshToken)

  return {
    user: sanitizeUser(user),
    token: accessToken,
  }
}

const revokeRefreshTokenRecord = async (refreshToken) => {
  if (!refreshToken) return

  const tokenHash = RefreshToken.hashToken(refreshToken)
  const record = await RefreshToken.findOne({ tokenHash, revokedAt: null })
  if (!record) return

  record.revokedAt = new Date()
  await record.save()
}

const revokeAllRefreshTokensForUser = async (userId) => {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  )
}

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
  const helperCopy =
    purpose === 'register'
      ? 'Once you confirm the code, your account will be ready and you can sign in right away.'
      : 'If you did not request a password reset, you can safely ignore this message.'

  return {
    subject:
      purpose === 'register'
        ? 'Your Cortina.D sign-up code'
        : 'Your Cortina.D password reset code',
    htmlContent: `
      <div style="margin:0;padding:32px 18px;background:#f6f2eb;font-family:Arial,sans-serif;color:#1b1715;">
        <div style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid rgba(104,76,52,0.12);border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(41,29,21,0.08);">
          <div style="padding:28px 30px;background:linear-gradient(135deg,#17110f 0%,#3b2a21 55%,#8a633f 100%);color:#f7efe4;">
            <div style="font-size:12px;letter-spacing:0.32em;text-transform:uppercase;opacity:0.8;">Cortina.D</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.25;font-weight:700;color:#fff7eb;">${heading}</h1>
            <p style="margin:14px 0 0;font-size:15px;line-height:1.8;color:#f1e2cf;">${intro}</p>
          </div>
          <div style="padding:30px;">
            <p style="margin:0;font-size:14px;line-height:1.8;color:#5f4a39;">Your one-time verification code is:</p>
            <div style="margin:18px 0 16px;display:inline-block;padding:14px 20px;border-radius:16px;background:linear-gradient(135deg,#f0d48b 0%,#c28f54 100%);color:#1b1715;font-size:28px;font-weight:700;letter-spacing:0.32em;box-shadow:0 12px 24px rgba(194,143,84,0.26);">
              ${code}
            </div>
            <p style="margin:0;font-size:14px;line-height:1.85;color:#5f4a39;">
              This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
            </p>
            <p style="margin:14px 0 0;font-size:14px;line-height:1.85;color:#5f4a39;">
              ${helperCopy}
            </p>
          </div>
          <div style="padding:18px 30px;border-top:1px solid rgba(104,76,52,0.1);background:#fbf6ef;font-size:12px;line-height:1.8;color:#7a6553;">
            This email was sent automatically by Cortina.D. Please do not share this code with anyone.
          </div>
        </div>
      </div>
    `,
    textContent: `${heading}\n\n${intro}\n\nCode: ${code}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes.\n\n${helperCopy}\n\nThis email was sent automatically by Cortina.D. Please do not share this code with anyone.`,
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

  const authPayload = await createAuthPayload(user, res)
  res.status(201).json(authPayload)
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

  const authPayload = await createAuthPayload(user, res)
  res.json(authPayload)
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
  await revokeAllRefreshTokensForUser(user._id)
  clearRefreshTokenCookie(res)

  res.json({
    message: 'Password reset successful. You can sign in with the new password now.',
  })
})

export const refreshSession = asyncHandler(async (req, res) => {
  refreshTokenSchema.parse(req.body || {})
  const refreshToken = getRefreshTokenFromRequest(req)

  if (!refreshToken) {
    clearRefreshTokenCookie(res)
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Refresh token is missing or expired.',
    })
  }

  let decoded
  try {
    decoded = verifyRefreshToken(refreshToken)
  } catch {
    clearRefreshTokenCookie(res)
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Refresh token is invalid or expired.',
    })
  }

  const tokenHash = RefreshToken.hashToken(refreshToken)
  const storedToken = await RefreshToken.findOne({
    tokenId: decoded.tokenId,
    tokenHash,
    userId: decoded.id,
  })

  if (!storedToken) {
    clearRefreshTokenCookie(res)
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Refresh token is invalid or expired.',
    })
  }

  if (storedToken.revokedAt) {
    await revokeAllRefreshTokensForUser(decoded.id)
    clearRefreshTokenCookie(res)
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Refresh token has already been used. Please sign in again.',
    })
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    storedToken.revokedAt = new Date()
    await storedToken.save()
    clearRefreshTokenCookie(res)

    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Refresh token is invalid or expired.',
    })
  }

  const user = await User.findById(decoded.id)
  if (!user) {
    storedToken.revokedAt = new Date()
    await storedToken.save()
    clearRefreshTokenCookie(res)
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'User not found.',
    })
  }

  const authPayload = await createAuthPayload(user, res, {
    previousTokenRecord: storedToken,
  })

  res.json(authPayload)
})

export const logout = asyncHandler(async (req, res) => {
  logoutSchema.parse(req.body || {})
  const refreshToken = getRefreshTokenFromRequest(req)
  await revokeRefreshTokenRecord(refreshToken)
  clearRefreshTokenCookie(res)
  res.json({ message: 'Signed out successfully.' })
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
