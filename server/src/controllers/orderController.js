import { ORDER_STATUS } from '../constants/orderStatus.js'
import { ROLES } from '../constants/roles.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import RewardRedemption from '../models/RewardRedemption.js'
import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import {
  createOrderSchema,
  orderFeedbackSchema,
  updateOrderSchema,
} from '../validators/order.js'
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js'
import { emitRealtimeEvent } from '../utils/realtime.js'

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

const buildProductImageUrl = (product) => {
  if (product?._id && (product?.image?.data || product?.image?.contentType)) {
    return `${API_BASE_URL}/api/v1/products/${String(product._id)}/image`
  }

  return product?.imageUrl || ''
}

const mapOrder = (order) => {
  const mapped = order.toObject()
  mapped.items = (mapped.items || []).map((item) => {
    if (item.productId && typeof item.productId === 'object') {
      const { image, ...productPayload } = item.productId
      return {
        ...item,
        productId: {
          ...productPayload,
          imageUrl: buildProductImageUrl(item.productId),
        },
      }
    }
    return item
  })
  return mapped
}

const emitOrderUpdate = (req, order, event, action, extra = {}) => {
  emitRealtimeEvent(req, event, {
    action,
    orderId: String(order._id),
    userId: String(order.userId),
    status: order.status,
    order,
    ...extra,
  })
}

const LOCKED_ORDER_STATUSES = [
  ORDER_STATUS.READY,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
]
const MANAGEABLE_ORDER_STATUSES = Object.values(ORDER_STATUS)

const canManageOrdersForUser = (user) =>
  user?.role === ROLES.ADMIN ||
  (user?.role === ROLES.STAFF && (user?.permissions || []).includes('manageOrders'))

const loadOrderWithRelations = (orderId, { includeUser = false } = {}) => {
  let query = Order.findById(orderId).populate({
    path: 'items.productId',
    select: '-image.data',
  })

  if (includeUser) {
    query = query.populate('userId', 'fullName phone email')
  }

  return query
}

const restoreRewardRedemptionsForOrder = async (order) => {
  const rewardRedemptionIds = (order.items || [])
    .filter((item) => item.isRewardRedemption && item.rewardRedemptionId)
    .map((item) => item.rewardRedemptionId)

  if (rewardRedemptionIds.length === 0) {
    return
  }

  await RewardRedemption.updateMany(
    {
      _id: { $in: rewardRedemptionIds },
      orderId: order._id,
      status: 'Applied',
    },
    {
      $set: {
        status: 'Redeemed',
        orderId: null,
        appliedAt: null,
      },
    }
  )
}

const getTrackedInventoryQuantity = (product) =>
  Number.isInteger(product?.inventoryQuantity) && product.inventoryQuantity >= 0
    ? product.inventoryQuantity
    : null

const buildInventoryDemand = (items = []) => {
  const demand = new Map()

  items.forEach((item) => {
    const productId = String(item.productId)
    const quantity = Number(item.quantity) || 0
    if (!productId || quantity <= 0) return
    demand.set(productId, (demand.get(productId) || 0) + quantity)
  })

  return demand
}

const buildInventoryError = (product, requestedQuantity) => {
  const productName = product?.name || 'This item'
  const availableQuantity = getTrackedInventoryQuantity(product)
  const error = new Error(
    availableQuantity === 0
      ? `${productName} is out of stock right now.`
      : `${productName} only has ${availableQuantity ?? 0} left in stock.`
  )
  error.statusCode = 409
  error.code = 'INSUFFICIENT_STOCK'
  error.productId = product?._id ? String(product._id) : ''
  error.availableQuantity = availableQuantity ?? 0
  error.requestedQuantity = requestedQuantity
  return error
}

const normalizePaymentMethod = (paymentMethod = 'Cash') => {
  const normalizedMethod = String(paymentMethod || 'Cash').trim() || 'Cash'

  if (normalizedMethod === 'Cash') {
    return 'Cash'
  }

  const error = new Error(
    'Electronic payment is temporarily unavailable. Please choose cash at pickup.'
  )
  error.statusCode = 400
  error.code = 'PAYMENT_METHOD_UNAVAILABLE'
  throw error
}

const reserveInventoryForItems = async (items = []) => {
  const demand = buildInventoryDemand(items)
  const reserved = []

  try {
    for (const [productId, quantity] of demand.entries()) {
      const currentProduct = await Product.findById(productId).select(
        'name isAvailable inventoryQuantity'
      )

      if (!currentProduct) {
        const error = new Error('Invalid product')
        error.statusCode = 400
        error.code = 'INVALID_PRODUCT'
        throw error
      }

      if (currentProduct.isAvailable === false) {
        const error = new Error(`${currentProduct.name} is currently unavailable.`)
        error.statusCode = 409
        error.code = 'PRODUCT_UNAVAILABLE'
        throw error
      }

      const inventoryQuantity = getTrackedInventoryQuantity(currentProduct)
      if (inventoryQuantity === null) {
        continue
      }

      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          isAvailable: { $ne: false },
          inventoryQuantity: { $gte: quantity },
        },
        { $inc: { inventoryQuantity: -quantity } },
        { new: true }
      ).select('name inventoryQuantity')

      if (!updatedProduct) {
        const latestProduct = await Product.findById(productId).select(
          'name inventoryQuantity'
        )
        throw buildInventoryError(latestProduct, quantity)
      }

      reserved.push({ productId, quantity })
    }
  } catch (error) {
    if (reserved.length > 0) {
      await Promise.all(
        reserved.map(({ productId, quantity }) =>
          Product.findByIdAndUpdate(productId, {
            $inc: { inventoryQuantity: quantity },
          })
        )
      )
    }
    throw error
  }

  return reserved
}

const restoreInventoryForItems = async (items = []) => {
  const demand = buildInventoryDemand(items)

  for (const [productId, quantity] of demand.entries()) {
    const currentProduct = await Product.findById(productId).select('inventoryQuantity')
    if (!currentProduct || getTrackedInventoryQuantity(currentProduct) === null) {
      continue
    }

    await Product.findByIdAndUpdate(productId, {
      $inc: { inventoryQuantity: quantity },
    })
  }
}

const buildRegularOrderItems = async (items = []) => {
  const productIds = items.map((item) => item.productId)
  const products = await Product.find({ _id: { $in: productIds } })
  const productMap = new Map(products.map((product) => [String(product._id), product]))

  return items.map((item) => {
    const product = productMap.get(item.productId)
    if (!product) {
      const error = new Error('Invalid product')
      error.statusCode = 400
      throw error
    }

    const sizeMatch = product.sizePrices?.find(
      (entry) => entry.size === item.selectedSize
    )
    const unitPrice = sizeMatch?.price ?? product.price

    return {
      productId: product._id,
      quantity: item.quantity,
      unitPrice,
      rewardId: null,
      rewardRedemptionId: null,
      isRewardRedemption: false,
      selectedSize: item.selectedSize || '',
      selectedAddOns: item.selectedAddOns || [],
      lineTotal: unitPrice * item.quantity,
    }
  })
}

export const createOrder = asyncHandler(async (req, res) => {
  const payload = createOrderSchema.parse(req.body)
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod || 'Cash')
  const rewardRedemptionIds = [...new Set(payload.rewardRedemptionIds || [])]
  const regularItems = await buildRegularOrderItems(payload.items)

  const rewardRedemptions = rewardRedemptionIds.length
    ? await RewardRedemption.find({
        _id: { $in: rewardRedemptionIds },
        userId: req.user._id,
        status: 'Redeemed',
      }).populate({
        path: 'rewardId',
        populate: { path: 'productId' },
      })
    : []

  if (rewardRedemptionIds.length && rewardRedemptions.length !== rewardRedemptionIds.length) {
    return res.status(400).json({
      code: 'INVALID_REWARD_REDEMPTION',
      message: 'One or more redeemed rewards are no longer available.',
    })
  }

  const rewardItems = rewardRedemptions.map((redemption) => {
    const reward = redemption.rewardId
    const product =
      reward?.productId && typeof reward.productId === 'object'
        ? reward.productId
        : null

    if (!reward || !product) {
      const error = new Error('Invalid redeemed reward')
      error.statusCode = 400
      throw error
    }

    return {
      productId: product._id,
      quantity: 1,
      unitPrice: 0,
      rewardId: reward._id,
      rewardRedemptionId: redemption._id,
      isRewardRedemption: true,
      selectedSize: '',
      selectedAddOns: [],
      lineTotal: 0,
    }
  })

  const items = [...regularItems, ...rewardItems]
  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0)

  let order = null
  let inventoryReserved = false

  try {
    await reserveInventoryForItems(items)
    inventoryReserved = true

    order = await Order.create({
      userId: req.user._id,
      paymentMethod,
      scheduledPickupTime: payload.scheduledPickupTime
        ? new Date(payload.scheduledPickupTime)
        : null,
      specialInstructions: payload.specialInstructions || '',
      items,
      totalAmount,
    })

    if (rewardRedemptions.length > 0) {
      const appliedRedemptions = await Promise.all(
        rewardRedemptions.map((redemption) =>
          RewardRedemption.findOneAndUpdate(
            {
              _id: redemption._id,
              userId: req.user._id,
              status: 'Redeemed',
            },
            {
              $set: {
                status: 'Applied',
                orderId: order._id,
                appliedAt: new Date(),
              },
            },
            { new: true }
          )
        )
      )

      if (appliedRedemptions.some((entry) => !entry)) {
        const error = new Error(
          'A redeemed reward was already used. Please review checkout again.'
        )
        error.statusCode = 409
        error.code = 'REWARD_ALREADY_USED'
        throw error
      }
    }

    emitOrderUpdate(req, order, 'order:new', 'created')
    res.status(201).json({ order })
  } catch (error) {
    if (order?._id) {
      await RewardRedemption.updateMany(
        {
          orderId: order._id,
          status: 'Applied',
        },
        {
          $set: {
            status: 'Redeemed',
            orderId: null,
            appliedAt: null,
          },
        }
      )
      await Order.findByIdAndDelete(order._id)
    }

    if (inventoryReserved) {
      await restoreInventoryForItems(items)
    }

    throw error
  }
})

export const getOrders = asyncHandler(async (req, res) => {
  const canManageOrders = canManageOrdersForUser(req.user)
  const filter = canManageOrders ? {} : { userId: req.user._id }
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 200,
  })
  const total = await Order.countDocuments(filter)
  let query = Order.find(filter)
    .populate({
      path: 'items.productId',
      select: '-image.data',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  if (canManageOrders) {
    query = query.populate('userId', 'fullName phone email')
  }

  const orders = await query
  const mappedOrders = orders.map(mapOrder)
  res.json(buildPaginatedResponse(mappedOrders, total, page, limit, 'orders'))
})

export const getOrderById = asyncHandler(async (req, res) => {
  const canManageOrders = canManageOrdersForUser(req.user)
  const order = await loadOrderWithRelations(req.params.id, {
    includeUser: canManageOrders,
  })
  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' })
  }
  if (!canManageOrders && String(order.userId) !== String(req.user._id)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }
  res.json({ order: mapOrder(order) })
})

export const updateOrder = asyncHandler(async (req, res) => {
  const payload = updateOrderSchema.parse(req.body)
  const order = await Order.findById(req.params.id)

  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' })
  }

  if (String(order.userId) !== String(req.user._id)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  if (LOCKED_ORDER_STATUSES.includes(order.status)) {
    return res
      .status(400)
      .json({ code: 'INVALID', message: 'This order can no longer be edited.' })
  }

  const rewardItems = (order.items || []).filter((item) => item.isRewardRedemption)
  const regularItems = await buildRegularOrderItems(payload.items || [])
  const nextItems = [...regularItems, ...rewardItems]

  if (nextItems.length === 0) {
    return res.status(400).json({
      code: 'INVALID',
      message: 'Your order cannot be empty. Remove it by cancelling instead.',
    })
  }

  const previousItems = (order.items || []).map((item) =>
    typeof item.toObject === 'function' ? item.toObject() : item
  )
  let nextInventoryReserved = false

  await restoreInventoryForItems(previousItems)

  try {
    await reserveInventoryForItems(nextItems)
    nextInventoryReserved = true

    order.items = nextItems
    order.totalAmount = nextItems.reduce(
      (sum, item) => sum + Number(item.lineTotal || 0),
      0
    )

    if (typeof payload.paymentMethod === 'string' && payload.paymentMethod.trim()) {
      order.paymentMethod = normalizePaymentMethod(payload.paymentMethod)
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'specialInstructions')) {
      order.specialInstructions = payload.specialInstructions || ''
    }

    order.lastEditedAt = new Date()

    await order.save()

    const updatedOrder = await loadOrderWithRelations(order._id)
    emitOrderUpdate(req, order, 'order:updated', 'updated')
    res.json({ order: mapOrder(updatedOrder) })
  } catch (error) {
    if (nextInventoryReserved) {
      await restoreInventoryForItems(nextItems)
    }

    await reserveInventoryForItems(previousItems)
    throw error
  }
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' })
  }
  if (status && !MANAGEABLE_ORDER_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ code: 'INVALID', message: 'Invalid status value' })
  }
  const prevStatus = order.status
  let loyaltyPoints = null
  order.status = status || order.status
  await order.save()
  if (
    order.status === ORDER_STATUS.COMPLETED &&
    prevStatus !== ORDER_STATUS.COMPLETED
  ) {
    const updatedUser = await User.findByIdAndUpdate(
      order.userId,
      { $inc: { loyaltyPoints: 1 } },
      { new: true, select: 'loyaltyPoints' }
    )
    loyaltyPoints = updatedUser?.loyaltyPoints ?? null
  }
  if (
    order.status === ORDER_STATUS.CANCELLED &&
    prevStatus !== ORDER_STATUS.CANCELLED &&
    prevStatus !== ORDER_STATUS.COMPLETED
  ) {
    await restoreInventoryForItems(order.items)
    await restoreRewardRedemptionsForOrder(order)
  }
  emitOrderUpdate(req, order, 'order:status', 'status-updated', {
    loyaltyPoints,
  })
  res.json({ order })
})

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' })
  }
  const canManageOrders = canManageOrdersForUser(req.user)
  if (!canManageOrders && String(order.userId) !== String(req.user._id)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }
  if (LOCKED_ORDER_STATUSES.includes(order.status)) {
    return res
      .status(400)
      .json({ code: 'INVALID', message: 'This order can no longer be cancelled.' })
  }
  order.status = ORDER_STATUS.CANCELLED
  await order.save()
  await restoreInventoryForItems(order.items)
  await restoreRewardRedemptionsForOrder(order)
  emitOrderUpdate(req, order, 'order:status', 'cancelled')
  res.json({ order })
})

export const deleteOrderItem = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' })
  }
  if (String(order.userId) !== String(req.user._id)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }
  if (LOCKED_ORDER_STATUSES.includes(order.status)) {
    return res
      .status(400)
      .json({ code: 'INVALID', message: 'Cannot edit this order' })
  }

  const removedItems = order.items.filter(
    (item) => String(item._id) === String(req.params.itemId)
  )
  order.items = order.items.filter(
    (item) => String(item._id) !== String(req.params.itemId)
  )
  order.totalAmount = order.items.reduce((sum, item) => sum + item.lineTotal, 0)
  await order.save()
  await restoreInventoryForItems(removedItems)

  const rewardRedemptionIds = removedItems
    .filter((item) => item.isRewardRedemption && item.rewardRedemptionId)
    .map((item) => item.rewardRedemptionId)

  if (rewardRedemptionIds.length > 0) {
    await RewardRedemption.updateMany(
      {
        _id: { $in: rewardRedemptionIds },
        orderId: order._id,
        status: 'Applied',
      },
      {
        $set: {
          status: 'Redeemed',
          orderId: null,
          appliedAt: null,
        },
      }
    )
  }

  const updatedOrder = await loadOrderWithRelations(order._id)
  res.json({ order: mapOrder(updatedOrder) })
})

export const submitOrderFeedback = asyncHandler(async (req, res) => {
  const payload = orderFeedbackSchema.parse(req.body)
  const order = await Order.findById(req.params.id)

  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' })
  }

  if (String(order.userId) !== String(req.user._id)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  if (order.status !== ORDER_STATUS.COMPLETED) {
    return res.status(400).json({
      code: 'INVALID',
      message: 'Feedback is available after the order is completed.',
    })
  }

  const latestOrder = await Order.findOne({ userId: req.user._id })
    .sort({ createdAt: -1, _id: -1 })
    .select('_id')

  if (!latestOrder || String(latestOrder._id) !== String(order._id)) {
    return res.status(400).json({
      code: 'INVALID',
      message: 'Feedback is only available on your latest order.',
    })
  }

  const currentUser = await User.findById(req.user._id).select('fullName phone email')

  order.feedback = {
    rating: payload.rating,
    comment: payload.comment || '',
    submittedAt: new Date(),
    customerName: currentUser?.fullName || req.user.fullName || '',
    customerPhone: currentUser?.phone || req.user.phone || '',
    customerEmail: currentUser?.email || req.user.email || '',
  }

  await order.save()

  const updatedOrder = await loadOrderWithRelations(order._id, { includeUser: true })
  emitOrderUpdate(req, order, 'order:feedback', 'feedback-submitted', {
    feedback: order.feedback,
  })
  res.json({ order: mapOrder(updatedOrder) })
})
