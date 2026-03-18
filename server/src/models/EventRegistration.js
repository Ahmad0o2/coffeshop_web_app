import mongoose from 'mongoose'

const eventRegistrationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Registered', 'Cancelled'],
      default: 'Registered',
    },
  },
  { timestamps: true }
)

eventRegistrationSchema.index(
  { eventId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Registered' },
  }
)

const EventRegistration = mongoose.model(
  'EventRegistration',
  eventRegistrationSchema
)

export default EventRegistration
