import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    capacity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Event = mongoose.model('Event', eventSchema)

export default Event
