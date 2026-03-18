import { z } from 'zod'

export const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  capacity: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export const eventRegisterSchema = z.object({
  notes: z.string().optional(),
})
