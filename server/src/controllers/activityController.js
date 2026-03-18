import ActivityLog from '../models/ActivityLog.js'
import asyncHandler from '../utils/asyncHandler.js'

export const getActivityLogs = asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500)
    : 200

  const logs = await ActivityLog.find().sort({ occurredAt: -1 }).limit(limit).lean()

  res.json({ logs })
})
