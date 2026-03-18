import SiteSettings from '../models/SiteSettings.js'
import asyncHandler from '../utils/asyncHandler.js'
import { emitRealtimeEvent } from '../utils/realtime.js'

const buildImageUrl = (image) => {
  if (image?.data && image?.contentType) {
    return `data:${image.contentType};base64,${image.data}`
  }
  return ''
}

const mapSettings = (settings) => ({
  id: settings._id,
  logoUrl: buildImageUrl(settings.logo),
  heroImageUrl: buildImageUrl(settings.heroImage),
  spaceGalleryUrls: (settings.spaceGalleryImages || []).map((image) =>
    buildImageUrl(image)
  ),
  homeDisplayUrls: (settings.homeDisplayImages || []).map((image) =>
    buildImageUrl(image)
  ),
  galleryUrls: (settings.galleryImages || []).map((image) =>
    buildImageUrl(image)
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

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }
  res.json({ settings: mapSettings(settings) })
})

export const updateSettings = asyncHandler(async (req, res) => {
  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  const permissions = req.user?.permissions || []
  const canManageBrand =
    req.user?.role === 'Admin' || permissions.includes('manageBrand')
  const canManageEvents =
    req.user?.role === 'Admin' || permissions.includes('manageEvents')
  const canManageProducts =
    req.user?.role === 'Admin' || permissions.includes('manageProducts')

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
  emitRealtimeEvent(req, 'settings:changed', {
    settings: mapSettings(settings),
  })
  res.json({ settings: mapSettings(settings) })
})

export const updateGalleryImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ code: 'INVALID', message: 'Invalid index' })
  }
  if (!req.file) {
    return res.status(400).json({ code: 'INVALID', message: 'Image required' })
  }

  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  const images = settings.galleryImages || []
  const image = {
    data: req.file.buffer.toString('base64'),
    contentType: req.file.mimetype,
  }

  if (index >= images.length) {
    images.push(image)
  } else {
    images[index] = image
  }

  settings.galleryImages = images.slice(0, 8)
  await settings.save()
  emitRealtimeEvent(req, 'settings:changed', {
    settings: mapSettings(settings),
  })
  res.json({ settings: mapSettings(settings) })
})

export const updateSpaceGalleryImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ code: 'INVALID', message: 'Invalid index' })
  }
  if (!req.file) {
    return res.status(400).json({ code: 'INVALID', message: 'Image required' })
  }

  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  const images = settings.spaceGalleryImages || []
  const image = {
    data: req.file.buffer.toString('base64'),
    contentType: req.file.mimetype,
  }

  if (index >= images.length) {
    images.push(image)
  } else {
    images[index] = image
  }

  settings.spaceGalleryImages = images.slice(0, 8)
  await settings.save()
  emitRealtimeEvent(req, 'settings:changed', {
    settings: mapSettings(settings),
  })
  res.json({ settings: mapSettings(settings) })
})

export const updateHomeDisplayImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ code: 'INVALID', message: 'Invalid index' })
  }
  if (!req.file) {
    return res.status(400).json({ code: 'INVALID', message: 'Image required' })
  }

  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  const images = settings.homeDisplayImages || []
  const image = {
    data: req.file.buffer.toString('base64'),
    contentType: req.file.mimetype,
  }

  if (index >= images.length) {
    images.push(image)
  } else {
    images[index] = image
  }

  settings.homeDisplayImages = images.slice(0, 8)
  await settings.save()
  emitRealtimeEvent(req, 'settings:changed', {
    settings: mapSettings(settings),
  })
  res.json({ settings: mapSettings(settings) })
})

export const deleteGalleryImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ code: 'INVALID', message: 'Invalid index' })
  }

  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  const images = settings.galleryImages || []
  if (index >= images.length) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Image not found' })
  }

  images.splice(index, 1)
  settings.galleryImages = images
  await settings.save()
  emitRealtimeEvent(req, 'settings:changed', {
    settings: mapSettings(settings),
  })
  res.json({ settings: mapSettings(settings) })
})

export const deleteSpaceGalleryImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ code: 'INVALID', message: 'Invalid index' })
  }

  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  const images = settings.spaceGalleryImages || []
  if (index >= images.length) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Image not found' })
  }

  images.splice(index, 1)
  settings.spaceGalleryImages = images
  await settings.save()
  emitRealtimeEvent(req, 'settings:changed', {
    settings: mapSettings(settings),
  })
  res.json({ settings: mapSettings(settings) })
})

export const deleteHomeDisplayImage = asyncHandler(async (req, res) => {
  const index = Number(req.params.index)
  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ code: 'INVALID', message: 'Invalid index' })
  }

  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create({})
  }

  const images = settings.homeDisplayImages || []
  if (index >= images.length) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Image not found' })
  }

  images.splice(index, 1)
  settings.homeDisplayImages = images
  await settings.save()
  emitRealtimeEvent(req, 'settings:changed', {
    settings: mapSettings(settings),
  })
  res.json({ settings: mapSettings(settings) })
})
