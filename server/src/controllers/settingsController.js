import { ROLES } from '../constants/roles.js'
import SiteSettings from '../models/SiteSettings.js'
import asyncHandler from '../utils/asyncHandler.js'
import { emitRealtimeEvent } from '../utils/realtime.js'

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
const SETTINGS_METADATA_SELECT = [
  'logo.contentType',
  'heroImage.contentType',
  'spaceGalleryImages.contentType',
  'homeDisplayImages.contentType',
  'galleryImages.contentType',
  'featuredEventIds',
  'todaysSpecialProductId',
  'featuredProductIds',
  'updatedAt',
].join(' ')
const SETTINGS_ASSET_SELECT = [
  'logo',
  'heroImage',
  'spaceGalleryImages',
  'homeDisplayImages',
  'galleryImages',
  'updatedAt',
].join(' ')

const settingsAssetCache = {
  version: '',
  assets: new Map(),
  warmPromise: null,
}

const getOrCreateSettings = async () => {
  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }
  return settings
}

const buildImageUrl = (path, image) =>
  image?.contentType
    ? `${API_BASE_URL}/api/v1/settings/image/${path}`
    : ''

const buildSettingsVersion = (settings) =>
  settings?.updatedAt ? new Date(settings.updatedAt).toISOString() : ''

const cacheSettingsAsset = (key, image) => {
  if (!image?.data || !image?.contentType) return

  settingsAssetCache.assets.set(key, {
    buffer: Buffer.from(image.data, 'base64'),
    contentType: image.contentType,
  })
}

const primeSettingsAssetCache = (settings) => {
  settingsAssetCache.version = buildSettingsVersion(settings)
  settingsAssetCache.assets.clear()

  cacheSettingsAsset('logo', settings?.logo)
  cacheSettingsAsset('hero', settings?.heroImage)

  ;(settings?.galleryImages || []).forEach((image, index) => {
    cacheSettingsAsset(`gallery:${index}`, image)
  })

  ;(settings?.homeDisplayImages || []).forEach((image, index) => {
    cacheSettingsAsset(`home-display:${index}`, image)
  })

  ;(settings?.spaceGalleryImages || []).forEach((image, index) => {
    cacheSettingsAsset(`space-gallery:${index}`, image)
  })
}

const ensureSettingsAssetCache = async (expectedVersion = '') => {
  if (
    settingsAssetCache.assets.size > 0 &&
    (!expectedVersion || settingsAssetCache.version === expectedVersion)
  ) {
    return
  }

  if (!settingsAssetCache.warmPromise) {
    settingsAssetCache.warmPromise = (async () => {
      const settings = await SiteSettings.findOne().select(SETTINGS_ASSET_SELECT).lean()

      if (!settings) {
        settingsAssetCache.version = ''
        settingsAssetCache.assets.clear()
        return
      }

      primeSettingsAssetCache(settings)
    })().finally(() => {
      settingsAssetCache.warmPromise = null
    })
  }

  await settingsAssetCache.warmPromise
}

const getCachedSettingsAsset = (key) => settingsAssetCache.assets.get(key) || null

const sendImageResponse = (res, image) => {
  const buffer = image?.buffer || (image?.data ? Buffer.from(image.data, 'base64') : null)
  const contentType = image?.contentType || ''

  if (!buffer || !contentType) {
    return res.status(404).json({ code: 'NOT_FOUND' })
  }

  res.set('Cache-Control', 'public, max-age=86400')
  res.contentType(contentType)
  res.send(buffer)
}

const mapSettings = (settings) => ({
  id: settings._id,
  logoUrl: buildImageUrl('logo', settings.logo),
  heroImageUrl: buildImageUrl('hero', settings.heroImage),
  spaceGalleryUrls: (settings.spaceGalleryImages || []).map((image, index) =>
    buildImageUrl(`space-gallery/${index}`, image)
  ),
  homeDisplayUrls: (settings.homeDisplayImages || []).map((image, index) =>
    buildImageUrl(`home-display/${index}`, image)
  ),
  galleryUrls: (settings.galleryImages || []).map((image, index) =>
    buildImageUrl(`gallery/${index}`, image)
  ),
  featuredEventIds: settings.featuredEventIds || [],
  todaysSpecialProductId: settings.todaysSpecialProductId || '',
  featuredProductIds: settings.featuredProductIds || [],
  updatedAt: settings.updatedAt,
})

const parseList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}

const parseImageIndex = (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    res.status(400).json({ code: 'INVALID', message: 'Invalid index' })
    return null
  }
  return index
}

const emitSettingsChange = (req, settings, action = 'updated') => {
  primeSettingsAssetCache(settings.toObject())
  emitRealtimeEvent(req, 'settings:changed', {
    action,
    settings: mapSettings(settings),
  })
}

const makeImageUpdater = (fieldName) =>
  asyncHandler(async (req, res) => {
    const index = parseImageIndex(req, res)
    if (index === null) return

    if (!req.file) {
      return res.status(400).json({ code: 'INVALID', message: 'Image required' })
    }

    const settings = await getOrCreateSettings()
    const images = [...(settings[fieldName] || [])]
    const image = {
      data: req.file.buffer.toString('base64'),
      contentType: req.file.mimetype,
    }

    if (index >= images.length) {
      images.push(image)
    } else {
      images[index] = image
    }

    settings[fieldName] = images.slice(0, 8)
    await settings.save()
    emitSettingsChange(req, settings)
    res.json({ settings: mapSettings(settings) })
  })

const makeImageDeleter = (fieldName) =>
  asyncHandler(async (req, res) => {
    const index = parseImageIndex(req, res)
    if (index === null) return

    const settings = await getOrCreateSettings()
    const images = [...(settings[fieldName] || [])]

    if (index >= images.length) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Image not found' })
    }

    images.splice(index, 1)
    settings[fieldName] = images
    await settings.save()
    emitSettingsChange(req, settings)
    res.json({ settings: mapSettings(settings) })
  })

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await SiteSettings.findOne().select(SETTINGS_METADATA_SELECT).lean()

  if (!settings) {
    const createdSettings = await SiteSettings.create({})
    settings = createdSettings.toObject()
  }

  const expectedVersion = buildSettingsVersion(settings)
  if (
    !settingsAssetCache.assets.size ||
    settingsAssetCache.version !== expectedVersion
  ) {
    void ensureSettingsAssetCache(expectedVersion)
  }

  res.json({ settings: mapSettings(settings) })
})

export const getLogoImage = asyncHandler(async (_req, res) => {
  let image = getCachedSettingsAsset('logo')
  if (!image) {
    await ensureSettingsAssetCache()
    image = getCachedSettingsAsset('logo')
  }
  return sendImageResponse(res, image)
})

export const getHeroImage = asyncHandler(async (_req, res) => {
  let image = getCachedSettingsAsset('hero')
  if (!image) {
    await ensureSettingsAssetCache()
    image = getCachedSettingsAsset('hero')
  }
  return sendImageResponse(res, image)
})

export const getGalleryImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  let image = getCachedSettingsAsset(`gallery:${index}`)
  if (!image) {
    await ensureSettingsAssetCache()
    image = getCachedSettingsAsset(`gallery:${index}`)
  }
  return sendImageResponse(res, image)
})

export const getHomeDisplayImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  let image = getCachedSettingsAsset(`home-display:${index}`)
  if (!image) {
    await ensureSettingsAssetCache()
    image = getCachedSettingsAsset(`home-display:${index}`)
  }
  return sendImageResponse(res, image)
})

export const getSpaceGalleryImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  let image = getCachedSettingsAsset(`space-gallery:${index}`)
  if (!image) {
    await ensureSettingsAssetCache()
    image = getCachedSettingsAsset(`space-gallery:${index}`)
  }
  return sendImageResponse(res, image)
})

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings()

  const permissions = req.user?.permissions || []
  const canManageBrand =
    req.user?.role === ROLES.ADMIN || permissions.includes('manageBrand')
  const canManageEvents =
    req.user?.role === ROLES.ADMIN || permissions.includes('manageEvents')
  const canManageProducts =
    req.user?.role === ROLES.ADMIN || permissions.includes('manageProducts')

  const payload = {}

  if (req.body.clearLogo === 'true') {
    payload.logo = { data: '', contentType: '' }
  }
  if (req.body.clearHero === 'true') {
    payload.heroImage = { data: '', contentType: '' }
  }
  if (req.body.clearSpaceGallery === 'true') {
    payload.spaceGalleryImages = []
  }
  if (req.body.clearHomeDisplay === 'true') {
    payload.homeDisplayImages = []
  }
  if (req.body.clearGallery === 'true') {
    payload.galleryImages = []
  }

  const logoFile = req.files?.logo?.[0]
  if (logoFile) {
    payload.logo = {
      data: logoFile.buffer.toString('base64'),
      contentType: logoFile.mimetype,
    }
  }

  const heroFile = req.files?.heroImage?.[0]
  if (heroFile) {
    payload.heroImage = {
      data: heroFile.buffer.toString('base64'),
      contentType: heroFile.mimetype,
    }
  }

  const galleryFiles = req.files?.galleryImages || []
  if (galleryFiles.length) {
    payload.galleryImages = galleryFiles.slice(0, 8).map((file) => ({
      data: file.buffer.toString('base64'),
      contentType: file.mimetype,
    }))
  }

  const spaceGalleryFiles = req.files?.spaceGalleryImages || []
  if (spaceGalleryFiles.length) {
    payload.spaceGalleryImages = spaceGalleryFiles.slice(0, 8).map((file) => ({
      data: file.buffer.toString('base64'),
      contentType: file.mimetype,
    }))
  }

  const homeDisplayFiles = req.files?.homeDisplayImages || []
  if (homeDisplayFiles.length) {
    payload.homeDisplayImages = homeDisplayFiles.slice(0, 8).map((file) => ({
      data: file.buffer.toString('base64'),
      contentType: file.mimetype,
    }))
  }

  const wantsBrandChange =
    payload.logo ||
    payload.heroImage ||
    payload.spaceGalleryImages ||
    payload.homeDisplayImages ||
    payload.galleryImages ||
    req.body.clearLogo === 'true' ||
    req.body.clearHero === 'true' ||
    req.body.clearSpaceGallery === 'true' ||
    req.body.clearHomeDisplay === 'true' ||
    req.body.clearGallery === 'true'

  if (wantsBrandChange && !canManageBrand) {
    return res
      .status(403)
      .json({ code: 'FORBIDDEN', message: 'Access denied' })
  }

  if (req.body.featuredEventIds !== undefined) {
    if (!canManageEvents) {
      return res
        .status(403)
        .json({ code: 'FORBIDDEN', message: 'Access denied' })
    }
    payload.featuredEventIds = parseList(req.body.featuredEventIds).slice(0, 2)
  }

  if (req.body.todaysSpecialProductId !== undefined) {
    if (!canManageProducts) {
      return res
        .status(403)
        .json({ code: 'FORBIDDEN', message: 'Access denied' })
    }
    payload.todaysSpecialProductId = String(req.body.todaysSpecialProductId || '').trim()
  }

  if (req.body.featuredProductIds !== undefined) {
    if (!canManageProducts) {
      return res
        .status(403)
        .json({ code: 'FORBIDDEN', message: 'Access denied' })
    }
    payload.featuredProductIds = parseList(req.body.featuredProductIds).slice(0, 6)
  }

  settings.set(payload)
  await settings.save()
  emitSettingsChange(req, settings)
  res.json({ settings: mapSettings(settings) })
})

export const updateGalleryImage = makeImageUpdater('galleryImages')
export const updateSpaceGalleryImage = makeImageUpdater('spaceGalleryImages')
export const updateHomeDisplayImage = makeImageUpdater('homeDisplayImages')

export const deleteGalleryImage = makeImageDeleter('galleryImages')
export const deleteSpaceGalleryImage = makeImageDeleter('spaceGalleryImages')
export const deleteHomeDisplayImage = makeImageDeleter('homeDisplayImages')
