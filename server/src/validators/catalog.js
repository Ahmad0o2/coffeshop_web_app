import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export const productSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  sizeOptions: z.array(z.string()).optional(),
  sizePrices: z
    .array(
      z.object({
        size: z.string().min(1),
        price: z.number().positive(),
      })
    )
    .optional(),
  addOns: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().optional(),
  inventoryQuantity: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
})
