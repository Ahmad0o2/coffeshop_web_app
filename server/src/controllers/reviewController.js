import Review from '../models/Review.js'
import asyncHandler from '../utils/asyncHandler.js'
import { reviewSchema } from '../validators/review.js'

export const addReview = asyncHandler(async (req, res) => {
  const payload = reviewSchema.parse(req.body)
  const review = await Review.create({
    userId: req.user._id,
    productId: payload.productId,
    rating: payload.rating,
    comment: payload.comment || '',
  })
  res.status(201).json({ review })
})

export const getReviews = asyncHandler(async (req, res) => {
  const { productId, userId } = req.query
  const filter = {}
  if (productId) filter.productId = productId
  if (userId) filter.userId = userId
  const reviews = await Review.find(filter).sort({ createdAt: -1 })
  res.json({ reviews })
})
