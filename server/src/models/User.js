import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['Customer', 'Staff', 'Admin'],
      default: 'Customer',
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    languagePreference: { type: String, default: 'en' },
    loyaltyPoints: { type: Number, default: 0 },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)

export default User
