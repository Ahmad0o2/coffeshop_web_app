import mongoose from 'mongoose'

const rewardRedemptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    redeemedAt: { type: Date, default: Date.now },
    appliedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Redeemed', 'Applied', 'Cancelled'],
      default: 'Redeemed',
    },
  },
  { timestamps: true }
)

rewardRedemptionSchema.index({ userId: 1, status: 1 })
rewardRedemptionSchema.index({ orderId: 1 })

const RewardRedemption = mongoose.model(
  'RewardRedemption',
  rewardRedemptionSchema
)

export default RewardRedemption
