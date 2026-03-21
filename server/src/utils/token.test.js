import jwt from 'jsonwebtoken'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

process.env.JWT_SECRET = 'test-jwt-secret'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret'

let generateAccessToken
let generateRefreshToken
let verifyAccessToken
let verifyRefreshToken
const originalJwtSecret = process.env.JWT_SECRET
const originalRefreshSecret = process.env.REFRESH_TOKEN_SECRET

describe('token utils', () => {
  beforeAll(async () => {
    ;({
      generateAccessToken,
      generateRefreshToken,
      verifyAccessToken,
      verifyRefreshToken,
    } = await import('./token.js'))
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret || 'test-jwt-secret'
    process.env.REFRESH_TOKEN_SECRET =
      originalRefreshSecret || 'test-refresh-secret'
  })

  it('creates and verifies an access token', () => {
    const token = generateAccessToken({
      _id: 'user-123',
      role: 'Staff',
      permissions: ['manageOrders', 'manageProducts'],
    })
    const decoded = verifyAccessToken(token)

    expect(decoded.id).toBe('user-123')
    expect(decoded.type).toBe('access')
    expect(decoded.role).toBe('Staff')
    expect(decoded.permissions).toEqual(['manageOrders', 'manageProducts'])
  })

  it('creates and verifies a refresh token with token id', () => {
    const token = generateRefreshToken('user-456', 'refresh-1')
    const decoded = verifyRefreshToken(token)

    expect(decoded.id).toBe('user-456')
    expect(decoded.type).toBe('refresh')
    expect(decoded.tokenId).toBe('refresh-1')
  })

  it('rejects tokens with the wrong type', () => {
    const refreshToken = jwt.sign(
      { id: 'user-789', type: 'refresh', tokenId: 'refresh-2' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    expect(() => verifyAccessToken(refreshToken)).toThrow('Invalid access token')
  })

  it('rejects expired access tokens', () => {
    const expiredToken = jwt.sign(
      { id: 'user-111', type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    )

    expect(() => verifyAccessToken(expiredToken)).toThrow()
  })

  it('throws when JWT_SECRET is not configured', () => {
    delete process.env.JWT_SECRET

    expect(() => generateAccessToken('user-222')).toThrow('JWT_SECRET is not set')
  })
})
