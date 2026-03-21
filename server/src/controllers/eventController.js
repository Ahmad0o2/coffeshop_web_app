import Event from '../models/Event.js'
import EventRegistration from '../models/EventRegistration.js'
import asyncHandler from '../utils/asyncHandler.js'
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js'
import { eventSchema, eventRegisterSchema } from '../validators/event.js'
import { emitRealtimeEvent } from '../utils/realtime.js'

const attachRegistrationCounts = async (events) => {
  const eventIds = events.map((event) => event._id)
  const counts = await EventRegistration.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        status: 'Registered',
      },
    },
    {
      $group: {
        _id: '$eventId',
        count: { $sum: 1 },
      },
    },
  ])

  const countMap = new Map(counts.map((entry) => [String(entry._id), entry.count]))

  return events.map((event) => {
    const mapped = event.toObject()
    mapped.registrationsCount = countMap.get(String(event._id)) || 0
    return mapped
  })
}

export const getEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ isActive: true }).sort({ startDateTime: 1 })
  res.json({ events: await attachRegistrationCounts(events) })
})

export const getAdminEvents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  })
  const total = await Event.countDocuments()
  const events = await Event.find().sort({ startDateTime: 1 }).skip(skip).limit(limit)
  const mappedEvents = await attachRegistrationCounts(events)
  res.json(buildPaginatedResponse(mappedEvents, total, page, limit, 'events'))
})

export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
  if (!event) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' })
  }
  res.json({ event })
})

export const createEvent = asyncHandler(async (req, res) => {
  const payload = eventSchema.parse(req.body)
  const event = await Event.create(payload)
  emitRealtimeEvent(req, 'events:changed', {
    action: 'created',
    entityId: String(event._id),
    event,
  })
  res.status(201).json({ event })
})

export const updateEvent = asyncHandler(async (req, res) => {
  const payload = eventSchema.partial().parse(req.body)
  const event = await Event.findByIdAndUpdate(req.params.id, payload, {
    new: true,
  })
  if (!event) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' })
  }
  emitRealtimeEvent(req, 'events:changed', {
    action: 'updated',
    entityId: String(event._id),
    event,
  })
  res.json({ event })
})

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id)
  if (!event) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' })
  }
  emitRealtimeEvent(req, 'events:changed', {
    action: 'deleted',
    entityId: String(event._id),
  })
  res.json({ message: 'Event deleted' })
})

export const registerForEvent = asyncHandler(async (req, res) => {
  eventRegisterSchema.parse(req.body || {})
  const event = await Event.findById(req.params.id)
  if (!event || !event.isActive) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' })
  }

  if (event.capacity > 0) {
    const count = await EventRegistration.countDocuments({
      eventId: event._id,
      status: 'Registered',
    })
    if (count >= event.capacity) {
      return res
        .status(400)
        .json({ code: 'FULL', message: 'Event is full' })
    }
  }

  const existing = await EventRegistration.findOne({
    eventId: event._id,
    userId: req.user._id,
    status: 'Registered',
  })
  if (existing) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: 'You are already registered for this event.',
    })
  }

  const cancelledRegistration = await EventRegistration.findOne({
    eventId: event._id,
    userId: req.user._id,
    status: 'Cancelled',
  }).sort({ updatedAt: -1 })

  let registration
  try {
    registration = cancelledRegistration
      ? await EventRegistration.findByIdAndUpdate(
          cancelledRegistration._id,
          {
            $set: {
              status: 'Registered',
              registeredAt: new Date(),
            },
          },
          { new: true }
        )
      : await EventRegistration.create({
          eventId: event._id,
          userId: req.user._id,
        })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        code: 'CONFLICT',
        message: 'You are already registered for this event.',
      })
    }
    throw error
  }

  const registrationsCount = await EventRegistration.countDocuments({
    eventId: event._id,
    status: 'Registered',
  })

  emitRealtimeEvent(req, 'events:changed', {
    action: 'registration-updated',
    entityId: String(event._id),
    eventId: String(event._id),
    registrationsCount,
  })

  res.status(201).json({
    registration,
    message: 'You are registered for this event.',
  })
})

export const unregisterFromEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
  if (!event) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found' })
  }

  const registration = await EventRegistration.findOne({
    eventId: event._id,
    userId: req.user._id,
    status: 'Registered',
  })

  if (!registration) {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'You are not registered for this event.',
    })
  }

  registration.status = 'Cancelled'
  await registration.save()

  const registrationsCount = await EventRegistration.countDocuments({
    eventId: event._id,
    status: 'Registered',
  })

  emitRealtimeEvent(req, 'events:changed', {
    action: 'registration-updated',
    entityId: String(event._id),
    eventId: String(event._id),
    registrationsCount,
  })

  res.json({
    registration,
    message: 'You have left this event registration.',
  })
})

export const getMyEventRegistrations = asyncHandler(async (req, res) => {
  const registrations = await EventRegistration.find({
    userId: req.user._id,
    status: 'Registered',
  })
    .select('eventId status registeredAt')
    .sort({ registeredAt: -1 })

  res.json({
    registrations,
    eventIds: registrations.map((entry) => String(entry.eventId)),
  })
})
