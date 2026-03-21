import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ORDER_STATUS } from '../constants/orderStatus.js'
import { ROLES } from '../constants/roles.js'

const mocks = vi.hoisted(() => ({
  Order: {
    create: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
    findOne: vi.fn(),
  },
  Product: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  RewardRedemption: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
  User: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
  schemas: {
    createOrderParse: vi.fn(),
    orderFeedbackParse: vi.fn(),
    updateOrderParse: vi.fn(),
  },
  emitRealtimeEvent: vi.fn(),
}))

vi.mock('../models/Order.js', () => ({ default: mocks.Order }))
vi.mock('../models/Product.js', () => ({ default: mocks.Product }))
vi.mock('../models/RewardRedemption.js', () => ({
  default: mocks.RewardRedemption,
}))
vi.mock('../models/User.js', () => ({ default: mocks.User }))
vi.mock('../utils/asyncHandler.js', () => ({ default: (handler) => handler }))
vi.mock('../validators/order.js', () => ({
  createOrderSchema: { parse: mocks.schemas.createOrderParse },
  orderFeedbackSchema: { parse: mocks.schemas.orderFeedbackParse },
  updateOrderSchema: { parse: mocks.schemas.updateOrderParse },
}))
vi.mock('../utils/pagination.js', () => ({
  buildPaginatedResponse: vi.fn(),
  parsePagination: vi.fn(),
}))
vi.mock('../utils/realtime.js', () => ({
  emitRealtimeEvent: mocks.emitRealtimeEvent,
}))

import {
  cancelOrder,
  createOrder,
  updateOrderStatus,
} from './orderController.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'

const createRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const selectResult = (value) => ({
  select: vi.fn().mockResolvedValue(value),
})

describe('orderController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.schemas.createOrderParse.mockReset()
    mocks.schemas.orderFeedbackParse.mockReset()
    mocks.schemas.updateOrderParse.mockReset()
  })

  it('rolls inventory back when reservation fails during order creation', async () => {
    const req = {
      body: {
        items: [
          { productId: 'p1', quantity: 1 },
          { productId: 'p2', quantity: 2 },
        ],
      },
      user: { _id: 'user-1' },
      app: { get: vi.fn() },
    }
    const res = createRes()

    mocks.schemas.createOrderParse.mockReturnValue({
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 2 },
      ],
      rewardRedemptionIds: [],
      paymentMethod: 'Cash',
      specialInstructions: '',
      scheduledPickupTime: '',
    })
    Product.find.mockResolvedValue([
      { _id: 'p1', price: 5 },
      { _id: 'p2', price: 7 },
    ])
    Product.findById
      .mockReturnValueOnce(
        selectResult({
          _id: 'p1',
          name: 'Latte',
          isAvailable: true,
          inventoryQuantity: 8,
        })
      )
      .mockReturnValueOnce(
        selectResult({
          _id: 'p2',
          name: 'Mocha',
          isAvailable: true,
          inventoryQuantity: 1,
        })
      )
      .mockReturnValueOnce(
        selectResult({
          _id: 'p2',
          name: 'Mocha',
          inventoryQuantity: 1,
        })
      )
    Product.findOneAndUpdate
      .mockReturnValueOnce(
        selectResult({
          _id: 'p1',
          name: 'Latte',
          inventoryQuantity: 7,
        })
      )
      .mockReturnValueOnce(selectResult(null))
    Product.findByIdAndUpdate.mockResolvedValue({})

    await expect(createOrder(req, res)).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      productId: 'p2',
      requestedQuantity: 2,
    })

    expect(Order.create).not.toHaveBeenCalled()
    expect(Product.findByIdAndUpdate).toHaveBeenCalledTimes(1)
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('p1', {
      $inc: { inventoryQuantity: 1 },
    })
  })

  it('restores inventory when an order is cancelled', async () => {
    const order = {
      _id: 'order-1',
      userId: 'user-1',
      status: ORDER_STATUS.RECEIVED,
      items: [{ productId: 'p1', quantity: 2 }],
      save: vi.fn().mockResolvedValue(),
    }
    const req = {
      params: { id: 'order-1' },
      user: { _id: 'user-1', role: ROLES.CUSTOMER, permissions: [] },
      app: { get: vi.fn() },
    }
    const res = createRes()

    Order.findById.mockResolvedValue(order)
    Product.findById.mockReturnValueOnce(
      selectResult({ _id: 'p1', inventoryQuantity: 6 })
    )
    Product.findByIdAndUpdate.mockResolvedValue({})

    await cancelOrder(req, res)

    expect(order.status).toBe(ORDER_STATUS.CANCELLED)
    expect(order.save).toHaveBeenCalled()
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('p1', {
      $inc: { inventoryQuantity: 2 },
    })
    expect(res.json).toHaveBeenCalledWith({ order })
  })

  it('adds loyalty points when a status change completes an order', async () => {
    const order = {
      _id: 'order-2',
      userId: 'user-2',
      status: ORDER_STATUS.RECEIVED,
      save: vi.fn().mockResolvedValue(),
    }
    const req = {
      body: { status: ORDER_STATUS.COMPLETED },
      params: { id: 'order-2' },
      app: { get: vi.fn() },
    }
    const res = createRes()

    Order.findById.mockResolvedValue(order)
    User.findByIdAndUpdate.mockResolvedValue({ loyaltyPoints: 12 })

    await updateOrderStatus(req, res)

    expect(order.status).toBe(ORDER_STATUS.COMPLETED)
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-2',
      { $inc: { loyaltyPoints: 1 } },
      { new: true, select: 'loyaltyPoints' }
    )
    expect(res.json).toHaveBeenCalledWith({ order })
  })

  it('rejects cancellation when the requester does not own the order', async () => {
    const order = {
      _id: 'order-3',
      userId: 'owner-1',
      status: ORDER_STATUS.RECEIVED,
      items: [{ productId: 'p1', quantity: 1 }],
      save: vi.fn().mockResolvedValue(),
    }
    const req = {
      params: { id: 'order-3' },
      user: { _id: 'other-user', role: ROLES.CUSTOMER, permissions: [] },
      app: { get: vi.fn() },
    }
    const res = createRes()

    Order.findById.mockResolvedValue(order)

    await cancelOrder(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      code: 'FORBIDDEN',
      message: 'Access denied',
    })
    expect(order.save).not.toHaveBeenCalled()
  })
})
