import crypto from 'crypto'
import mongoose from 'mongoose'

const authOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    purpose: {
      type: String,
      enum: ['register', 'reset-password'],
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

authOtpSchema.index({ phone: 1, purpose: 1, consumedAt: 1 })

authOtpSchema.statics.hashCode = function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

const AuthOtp = mongoose.model('AuthOtp', authOtpSchema)

export default AuthOtp
