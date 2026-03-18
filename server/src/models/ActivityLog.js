import mongoose from 'mongoose'

const actorSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    fullName: { type: String, default: '' },
    role: { type: String, default: '' },
  },
  { _id: false }
)

const activityLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, trim: true, index: true },
    action: { type: String, default: '', trim: true },
    entity: { type: String, default: '', trim: true },
    entityId: { type: String, default: '', trim: true },
    actor: { type: actorSchema, default: null },
    occurredAt: { type: Date, default: Date.now, index: true },
    summary: { type: String, default: '', trim: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
)

activityLogSchema.index({ occurredAt: -1 })

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)

export default ActivityLog
