import ActivityLog from '../models/ActivityLog.js'

export const PUBLIC_SOCKET_ROOM = 'public'
export const ADMIN_SOCKET_ROOM = 'admin'
export const buildUserSocketRoom = (userId) => `user:${String(userId)}`

const buildActor = (user) => {
  if (!user) return null
  return {
    id: String(user._id),
    fullName: user.fullName,
    role: user.role,
  }
}

const getActivitySubject = (payload = {}) =>
  payload.product?.name ||
  payload.category?.name ||
  payload.event?.title ||
  payload.reward?.title ||
  payload.staff?.fullName ||
  ''

const buildActivitySummary = (event, payload = {}, actor = null) => {
  const actorName = actor?.fullName || actor?.role || 'Someone'
  const subject = getActivitySubject(payload)

  switch (event) {
    case 'order:new':
      return `${actorName} created order #${String(payload.orderId || '').slice(-6)}`
    case 'order:status':
      return `${actorName} changed order #${String(payload.orderId || '').slice(-6)} to ${payload.status || 'updated'}`
    case 'order:updated':
      return `${actorName} updated order #${String(payload.orderId || '').slice(-6)}`
    case 'order:feedback':
      return `${actorName} left feedback for order #${String(payload.orderId || '').slice(-6)}`
    case 'catalog:changed':
      return `${actorName} ${payload.action || 'updated'} ${payload.entity || 'catalog item'}${
        subject ? ` (${subject})` : ''
      }`
    case 'events:changed':
      return `${actorName} ${payload.action || 'updated'} event${
        subject ? ` "${subject}"` : ''
      }`
    case 'rewards:changed':
      return `${actorName} ${payload.action || 'updated'} reward${
        subject ? ` "${subject}"` : ''
      }`
    case 'settings:changed':
      return `${actorName} updated home or brand settings`
    case 'staff:changed':
      return `${actorName} ${payload.action || 'updated'} staff access${
        subject ? ` for ${subject}` : ''
      }`
    default:
      return `${actorName} updated the dashboard`
  }
}

const buildActivityDetails = (event, payload = {}) => ({
  event,
  action: payload.action || '',
  entity: payload.entity || '',
  entityId: payload.entityId || payload.subjectId || '',
  orderId: payload.orderId || '',
  status: payload.status || '',
  subject: getActivitySubject(payload),
})

const emitToRooms = (io, rooms, event, payload) => {
  const uniqueRooms = [...new Set(rooms.filter(Boolean))]

  if (!uniqueRooms.length) return

  let broadcaster = io
  uniqueRooms.forEach((room) => {
    broadcaster = broadcaster.to(room)
  })

  broadcaster.emit(event, payload)
}

const resolveEventRooms = (event, payload = {}) => {
  switch (event) {
    case 'catalog:changed':
    case 'events:changed':
    case 'rewards:changed':
    case 'settings:changed':
      return [PUBLIC_SOCKET_ROOM]
    case 'order:new':
    case 'order:status':
    case 'order:updated':
    case 'order:feedback':
      return [ADMIN_SOCKET_ROOM, payload.userId ? buildUserSocketRoom(payload.userId) : null]
    case 'staff:changed':
      return [ADMIN_SOCKET_ROOM, payload.subjectId ? buildUserSocketRoom(payload.subjectId) : null]
    default:
      return [ADMIN_SOCKET_ROOM]
  }
}

export const emitRealtimeEvent = (req, event, payload = {}) => {
  const io = req.app.get('io')
  const actor = buildActor(req.user)
  const occurredAt = new Date()

  const envelope = {
    ...payload,
    event,
    occurredAt: occurredAt.toISOString(),
    actor,
    summary: buildActivitySummary(event, payload, actor),
    details: buildActivityDetails(event, payload),
  }

  ActivityLog.create({
    event,
    action: payload.action || '',
    entity: payload.entity || '',
    entityId: payload.entityId || payload.subjectId || '',
    actor,
    occurredAt,
    summary: envelope.summary,
    details: envelope.details,
  }).catch((error) => {
    console.error('Failed to persist activity log', error)
  })

  if (!io) return

  emitToRooms(io, resolveEventRooms(event, payload), event, envelope)
  emitToRooms(io, [ADMIN_SOCKET_ROOM], 'admin:activity', envelope)
}
