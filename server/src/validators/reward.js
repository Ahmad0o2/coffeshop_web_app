import { z } from 'zod'

export const rewardSchema = z.object({
  productId: z.string().min(1),
  pointsRequired: z.coerce.number().int().positive(),
  isActive: z.boolean().optional(),
})

export const redeemSchema = z.object({
  rewardId: z.string().min(1),
})
