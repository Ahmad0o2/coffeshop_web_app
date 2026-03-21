import { beforeAll, describe, expect, it } from 'vitest'

process.env.JWT_SECRET = 'test-jwt-secret'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret'

let generateAccessToken
let generateRefreshToken
let verifyAccessToken
let verifyRefreshToken

describe('token utils', () => {
  beforeAll(async () => {
    ;({
      generateAccessToken,
      generateRefreshToken,
      verifyAccessToken,
      verifyRefreshToken,
    } = await import('./token.js'))
  })

  it('creates and verifies an access token', () => {
    const token = generateAccessToken('user-123')
    const decoded = verifyAccessToken(token)

    expect(decoded.id).toBe('user-123')
    expect(decoded.type).toBe('access')
  })

  it('creates and verifies a refresh token with token id', () => {
    const token = generateRefreshToken('user-456', 'refresh-1')
    const decoded = verifyRefreshToken(token)

    expect(decoded.id).toBe('user-456')
    expect(decoded.type).toBe('refresh')
    expect(decoded.tokenId).toBe('refresh-1')
  })
})
