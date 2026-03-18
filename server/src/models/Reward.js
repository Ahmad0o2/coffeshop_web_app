import mongoose from 'mongoose'

const rewardSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    pointsRequired: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Reward = mongoose.model('Reward', rewardSchema)

export default Reward
