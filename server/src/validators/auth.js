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

export const registerSchema = z
  .object({
    fullName: z.string().min(2),
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    password: z.string().min(6),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Email or phone is required',
    path: ['email'],
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
