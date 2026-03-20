import { z } from 'zod'
import { PERMISSIONS } from '../constants/permissions.js'

const requiredEmailSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  return value.trim()
}, z.string().email())

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}, z.string().email().optional())

const permissionsSchema = z
  .array(z.string())
  .optional()
  .transform((value) => {
    if (!Array.isArray(value)) return []
    return value.filter((perm) => PERMISSIONS.includes(perm))
  })

export const staffCreateSchema = z.object({
  email: requiredEmailSchema,
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
  role: z.enum(['Staff', 'Admin']).optional(),
  permissions: permissionsSchema,
})

export const staffUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: optionalEmailSchema,
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
  role: z.enum(['Staff', 'Admin']).optional(),
  permissions: permissionsSchema,
})
