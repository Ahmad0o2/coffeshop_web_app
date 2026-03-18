import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { staffCreateSchema, staffUpdateSchema } from '../validators/staff.js'
import { emitRealtimeEvent } from '../utils/realtime.js'

const mapStaff = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  username: user.username,
  phone: user.phone,
  role: user.role,
  permissions: user.permissions || [],
  createdAt: user.createdAt,
})

const ensureAdminExists = async (userIdBeingChanged) => {
  const adminCount = await User.countDocuments({ role: 'Admin' })
  if (adminCount <= 1) {
    const admin = await User.findOne({ role: 'Admin' })
    if (admin && String(admin._id) === String(userIdBeingChanged)) {
      return false
    }
  }
  return true
}

export const getStaff = asyncHandler(async (_req, res) => {
  const staff = await User.find({ role: { $in: ['Admin', 'Staff'] } })
    .select('-passwordHash')
    .sort({ createdAt: -1 })
  res.json({ staff: staff.map(mapStaff) })
})

export const createStaff = asyncHandler(async (req, res) => {
  const payload = staffCreateSchema.parse(req.body)
  const email = payload.email.toLowerCase()
  const existing = await User.findOne({ email })

  if (existing) {
    if (payload.fullName) existing.fullName = payload.fullName
    if (payload.phone !== undefined) existing.phone = payload.phone
    if (payload.role) existing.role = payload.role
    if (payload.permissions) existing.permissions = payload.permissions
    await existing.save()
    emitRealtimeEvent(req, 'staff:changed', {
      action: 'updated',
      subjectId: String(existing._id),
      staff: mapStaff(existing),
    })
    return res.json({ staff: mapStaff(existing) })
  }

  if (!payload.fullName) {
    return res
      .status(400)
      .json({ code: 'INVALID', message: 'Full name is required.' })
  }
  if (!payload.password) {
    return res
      .status(400)
      .json({ code: 'INVALID', message: 'Password is required.' })
  }

  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(payload.password, salt)

  const user = await User.create({
    fullName: payload.fullName,
    email,
    phone: payload.phone,
    passwordHash,
    role: payload.role || 'Staff',
    permissions: payload.permissions || [],
  })

  emitRealtimeEvent(req, 'staff:changed', {
    action: 'created',
    subjectId: String(user._id),
    staff: mapStaff(user),
  })
  res.status(201).json({ staff: mapStaff(user) })
})

export const updateStaff = asyncHandler(async (req, res) => {
  const payload = staffUpdateSchema.parse(req.body)
  const staff = await User.findById(req.params.id)
  if (!staff) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' })
  }

  if (payload.email) {
    const existing = await User.findOne({
      email: payload.email.toLowerCase(),
      _id: { $ne: staff._id },
    })
    if (existing) {
      return res
        .status(409)
        .json({ code: 'CONFLICT', message: 'Email already in use' })
    }
    staff.email = payload.email.toLowerCase()
  }

  if (payload.fullName) staff.fullName = payload.fullName
  if (payload.phone !== undefined) staff.phone = payload.phone

  if (payload.role && payload.role !== staff.role) {
    if (staff.role === 'Admin' && payload.role !== 'Admin') {
      const canChange = await ensureAdminExists(staff._id)
      if (!canChange) {
        return res
          .status(400)
          .json({ code: 'INVALID', message: 'At least one admin is required.' })
      }
    }
    staff.role = payload.role
  }

  if (payload.permissions) {
    staff.permissions = payload.permissions
  }

  await staff.save()
  emitRealtimeEvent(req, 'staff:changed', {
    action: 'updated',
    subjectId: String(staff._id),
    staff: mapStaff(staff),
  })
  res.json({ staff: mapStaff(staff) })
})

export const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await User.findById(req.params.id)
  if (!staff) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' })
  }
  if (String(staff._id) === String(req.user._id)) {
    return res
      .status(400)
      .json({ code: 'INVALID', message: 'You cannot remove yourself.' })
  }
  if (staff.role === 'Admin') {
    const canChange = await ensureAdminExists(staff._id)
    if (!canChange) {
      return res
        .status(400)
        .json({ code: 'INVALID', message: 'At least one admin is required.' })
    }
  }

  staff.role = 'Customer'
  staff.permissions = []
  await staff.save()
  emitRealtimeEvent(req, 'staff:changed', {
    action: 'removed',
    subjectId: String(staff._id),
    staff: mapStaff(staff),
  })
  res.json({ message: 'Access removed' })
})
