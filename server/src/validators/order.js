import { z } from 'zod'

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  selectedSize: z.string().optional(),
  selectedAddOns: z.array(z.string()).optional(),
})

export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).default([]),
    rewardRedemptionIds: z.array(z.string().min(1)).default([]),
    paymentMethod: z.string().optional(),
    scheduledPickupTime: z.string().optional(),
    tableId: z.string().optional().nullable(),
    specialInstructions: z.string().optional(),
  })
  .refine(
    (payload) =>
      Array.isArray(payload.items) && payload.items.length > 0
        ? true
        : Array.isArray(payload.rewardRedemptionIds) &&
          payload.rewardRedemptionIds.length > 0,
    {
      message: 'Order must include at least one item or one redeemed reward.',
      path: ['items'],
    }
  )
