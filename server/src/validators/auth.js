import { z } from 'zod'

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}, z.string().email().optional())

const optionalIdentifierSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}, z.string().min(1).optional())

const optionalPhoneSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}, z.string().min(6).optional())

const requiredPhoneSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  return value.trim()
}, z.string().min(6))

const otpCodeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}, z.string().regex(/^\d{4,6}$/).optional())

const requiredOtpCodeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  return value.trim()
}, z.string().regex(/^\d{4,6}$/))

export const registerSchema = z
  .object({
    fullName: z.string().min(2),
    email: z.preprocess((value) => {
      if (typeof value !== 'string') return value
      return value.trim()
    }, z.string().email()),
    phone: requiredPhoneSchema,
    password: z.string().min(6),
    otpCode: otpCodeSchema,
  })
  .refine((data) => data.otpCode, {
    message: 'OTP code is required',
    path: ['otpCode'],
  })

export const loginSchema = z
  .object({
    email: optionalIdentifierSchema,
    username: optionalIdentifierSchema,
    identifier: optionalIdentifierSchema,
    phone: optionalPhoneSchema,
    password: z.string().min(5),
  })
  .refine((data) => data.identifier || data.username || data.email || data.phone, {
    message: 'Email, username, or phone is required',
    path: ['email'],
  })

export const requestOtpSchema = z.object({
  email: z.preprocess((value) => {
    if (typeof value !== 'string') return value
    return value.trim()
  }, z.string().email()),
  purpose: z.enum(['register', 'reset-password']),
})

export const resetPasswordSchema = z.object({
  email: z.preprocess((value) => {
    if (typeof value !== 'string') return value
    return value.trim()
  }, z.string().email()),
  otpCode: requiredOtpCodeSchema,
  newPassword: z.string().min(6),
})
