import { describe, expect, it, vi } from 'vitest'
import { ROLES } from '../constants/roles.js'
import requirePermission from './requirePermission.js'

const createRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('requirePermission middleware', () => {
  it('allows admins through immediately', () => {
    const req = { user: { role: ROLES.ADMIN, permissions: [] } }
    const res = createRes()
    const next = vi.fn()

    requirePermission('manageOrders')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('allows staff members when they have the required permission', () => {
    const req = {
      user: { role: ROLES.STAFF, permissions: ['manageOrders', 'manageRewards'] },
    }
    const res = createRes()
    const next = vi.fn()

    requirePermission('manageOrders')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects staff members when they lack the required permission', () => {
    const req = {
      user: { role: ROLES.STAFF, permissions: ['manageRewards'] },
    }
    const res = createRes()
    const next = vi.fn()

    requirePermission('manageOrders')(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('rejects customers', () => {
    const req = { user: { role: ROLES.CUSTOMER, permissions: ['manageOrders'] } }
    const res = createRes()
    const next = vi.fn()

    requirePermission('manageOrders')(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('rejects requests without a user', () => {
    const req = {}
    const res = createRes()
    const next = vi.fn()

    requirePermission('manageOrders')(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      code: 'FORBIDDEN',
      message: 'Access denied',
    })
  })
})
