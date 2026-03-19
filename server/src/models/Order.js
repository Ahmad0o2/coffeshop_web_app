import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
      default: null,
    },
    rewardRedemptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RewardRedemption',
      default: null,
    },
    isRewardRedemption: { type: Boolean, default: false },
    selectedSize: { type: String, default: '' },
    selectedAddOns: { type: [String], default: [] },
    lineTotal: { type: Number, required: true },
  }
)

const orderFeedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
    status: {
      type: String,
      enum: ['Received', 'InProgress', 'Ready', 'Completed', 'Cancelled'],
      default: 'Received',
    },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Cash' },
    scheduledPickupTime: { type: Date, default: null },
    specialInstructions: { type: String, default: '' },
    items: { type: [orderItemSchema], required: true },
    feedback: { type: orderFeedbackSchema, default: null },
  },
  { timestamps: true }
)

const Order = mongoose.model('Order', orderSchema)

export default Order
