const normalizePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export const parsePagination = (
  query = {},
  { defaultPage = 1, defaultLimit = 20, maxLimit = 100 } = {}
) => {
  const page = normalizePositiveInteger(query.page, defaultPage)
  const requestedLimit = normalizePositiveInteger(query.limit, defaultLimit)
  const limit = Math.min(requestedLimit, maxLimit)

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

export const buildPaginatedResponse = (items, total, page, limit, legacyKey) => {
  const pages = Math.max(1, Math.ceil(total / limit) || 1)

  return {
    data: items,
    ...(legacyKey ? { [legacyKey]: items } : {}),
    total,
    page,
    pages,
  }
}
