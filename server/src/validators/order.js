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

export const updateOrderSchema = z.object({
  items: z.array(orderItemSchema).default([]),
  paymentMethod: z.string().optional(),
  specialInstructions: z.string().optional(),
})

export const orderFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1200).optional(),
})
