import Reward from '../models/Reward.js'
import RewardRedemption from '../models/RewardRedemption.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js'
import { redeemSchema, rewardSchema } from '../validators/reward.js'
import { emitRealtimeEvent } from '../utils/realtime.js'

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

const buildProductImageUrl = (product) => {
  if (product?._id && (product?.image?.data || product?.image?.contentType)) {
    return `${API_BASE_URL}/api/v1/products/${String(product._id)}/image`
  }

  return product?.imageUrl || ''
}

const mapReward = (reward) => {
  const mapped = reward?.toObject ? reward.toObject() : reward
  const product =
    mapped?.productId && typeof mapped.productId === 'object' ? mapped.productId : null
  const productPayload = product
    ? (({ image, ...rest }) => rest)(product)
    : null

  return {
    ...mapped,
    title: product?.name || mapped?.title || 'Reward',
    description: product?.description || mapped?.description || '',
    imageUrl: buildProductImageUrl(product),
    product: productPayload
      ? {
          ...productPayload,
          imageUrl: buildProductImageUrl(product),
        }
      : null,
  }
}

const attachRewardProduct = async (reward) => {
  await reward.populate({ path: 'productId', select: '-image.data' })
  return reward
}

export const getRewards = asyncHandler(async (req, res) => {
  const rewards = await Reward.find({ isActive: true })
    .populate({ path: 'productId', select: '-image.data' })
    .sort({ pointsRequired: 1 })
  res.json({ rewards: rewards.map(mapReward) })
})

export const getAdminRewards = asyncHandler(async (_req, res) => {
  const { page, limit, skip } = parsePagination(_req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  })
  const total = await Reward.countDocuments()
  const rewards = await Reward.find()
    .populate({ path: 'productId', select: '-image.data' })
    .sort({ pointsRequired: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
  const mappedRewards = rewards.map(mapReward)
  res.json(buildPaginatedResponse(mappedRewards, total, page, limit, 'rewards'))
})

export const createReward = asyncHandler(async (req, res) => {
  const payload = rewardSchema.parse(req.body)
  const product = await Product.findById(payload.productId)
  if (!product) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' })
  }

  const reward = await Reward.create({
    ...payload,
    title: product.name,
    description: product.description || '',
  })
  await attachRewardProduct(reward)

  emitRealtimeEvent(req, 'rewards:changed', {
    action: 'created',
    rewardId: String(reward._id),
    reward: mapReward(reward),
  })
  res.status(201).json({ reward: mapReward(reward) })
})

export const updateReward = asyncHandler(async (req, res) => {
  const payload = rewardSchema.partial().parse(req.body)
  let product = null

  if (payload.productId) {
    product = await Product.findById(payload.productId)
    if (!product) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' })
    }
    payload.title = product.name
    payload.description = product.description || ''
  }

  const reward = await Reward.findByIdAndUpdate(req.params.id, payload, {
    new: true,
  })
  if (!reward) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Reward not found' })
  }

  await attachRewardProduct(reward)

  emitRealtimeEvent(req, 'rewards:changed', {
    action: 'updated',
    rewardId: String(reward._id),
    reward: mapReward(reward),
  })
  res.json({ reward: mapReward(reward) })
})

export const deleteReward = asyncHandler(async (req, res) => {
  const reward = await Reward.findByIdAndDelete(req.params.id)
  if (!reward) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Reward not found' })
  }
  emitRealtimeEvent(req, 'rewards:changed', {
    action: 'deleted',
    rewardId: String(reward._id),
    reward,
  })
  res.json({ message: 'Reward deleted' })
})

export const redeemReward = asyncHandler(async (req, res) => {
  const payload = redeemSchema.parse(req.body)
  const reward = await Reward.findById(payload.rewardId)
  if (!reward || !reward.isActive) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Reward not found' })
  }

  const user = await User.findOneAndUpdate(
    {
      _id: req.user._id,
      loyaltyPoints: { $gte: reward.pointsRequired },
    },
    { $inc: { loyaltyPoints: -reward.pointsRequired } },
    { new: true, select: '_id loyaltyPoints' }
  )

  if (!user) {
    const userExists = await User.exists({ _id: req.user._id })
    if (!userExists) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' })
    }

    return res
      .status(400)
      .json({ code: 'INSUFFICIENT_POINTS', message: 'Not enough points' })
  }

  const redemption = await RewardRedemption.create({
    userId: user._id,
    rewardId: reward._id,
  })

  res.status(201).json({ redemption })
})

export const getRewardHistory = asyncHandler(async (req, res) => {
  const redemptions = await RewardRedemption.find({ userId: req.user._id })
    .populate({
      path: 'rewardId',
      populate: { path: 'productId', select: '-image.data' },
    })
    .sort({ createdAt: -1 })

  const mappedRedemptions = redemptions.map((redemption) => {
    const mapped = redemption.toObject()
    if (mapped.rewardId && typeof mapped.rewardId === 'object') {
      mapped.rewardId = mapReward(mapped.rewardId)
    }
    return mapped
  })

  res.json({ redemptions: mappedRedemptions })
})
