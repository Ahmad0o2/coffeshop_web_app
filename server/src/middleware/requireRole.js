import { ROLES } from '../constants/roles.js'

const VALID_ROLES = new Set(Object.values(ROLES))

const requireRole = (...roles) => (req, res, next) => {
  const allowedRoles = roles.filter((role) => VALID_ROLES.has(role))

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res
      .status(403)
      .json({ code: 'FORBIDDEN', message: 'Access denied' })
  }
  next()
}

export default requireRole
