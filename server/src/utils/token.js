import jwt from 'jsonwebtoken'

const getAccessSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return secret
}

const getRefreshSecret = () =>
  process.env.REFRESH_TOKEN_SECRET || getAccessSecret()

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m'
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '30d'

const buildAccessTokenClaims = (userOrId) => {
  if (typeof userOrId === 'object' && userOrId !== null) {
    return {
      id: String(userOrId._id || userOrId.id || ''),
      role: userOrId.role || 'Customer',
      permissions: Array.isArray(userOrId.permissions) ? userOrId.permissions : [],
    }
  }

  return {
    id: String(userOrId),
    role: 'Customer',
    permissions: [],
  }
}

export const generateAccessToken = (user) =>
  jwt.sign({ ...buildAccessTokenClaims(user), type: 'access' }, getAccessSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  })

export const generateRefreshToken = (userId, tokenId) =>
  jwt.sign({ id: userId, type: 'refresh', tokenId }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
  })

export const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, getAccessSecret())
  if (decoded?.type !== 'access') {
    throw new Error('Invalid access token')
  }
  return decoded
}

export const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, getRefreshSecret())
  if (decoded?.type !== 'refresh') {
    throw new Error('Invalid refresh token')
  }
  return decoded
}

export const generateToken = generateAccessToken
