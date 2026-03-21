import { PERMISSIONS } from '../constants/permissions.js'
import { ROLES } from '../constants/roles.js'

const requirePermission = (...required) => (req, res, next) => {
  if (!req.user) {
    return res
      .status(403)
      .json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  if (req.user.role === ROLES.ADMIN) {
    return next()
  }

  if (req.user.role !== ROLES.STAFF) {
    return res
      .status(403)
      .json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  const userPermissions = Array.isArray(req.user.permissions)
    ? req.user.permissions
    : []
  const normalized = required.filter((perm) => PERMISSIONS.includes(perm))
  if (normalized.length === 0) {
    return res
      .status(403)
      .json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  if (normalized.some((perm) => userPermissions.includes(perm))) {
    return next()
  }

  return res
    .status(403)
    .json({ code: 'FORBIDDEN', message: 'Access denied' })
}

export default requirePermission
