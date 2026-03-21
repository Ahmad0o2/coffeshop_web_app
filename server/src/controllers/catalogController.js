import Category from '../models/Category.js'
import Product from '../models/Product.js'
import asyncHandler from '../utils/asyncHandler.js'
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js'
import { categorySchema } from '../validators/catalog.js'
import { emitRealtimeEvent } from '../utils/realtime.js'

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

const buildInlineImageUrl = (product) => {
  if (product?.image?.data && product?.image?.contentType) {
    return `data:${product.image.contentType};base64,${product.image.data}`
  }
  return product.imageUrl || ''
}

const buildProductImageUrl = (product) => {
  if (product?._id && (product?.image?.data || product?.image?.contentType)) {
    return `${API_BASE_URL}/api/v1/products/${String(product._id)}/image`
  }

  return product?.imageUrl || ''
}

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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseSizePrices = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => ({
        size: entry.size,
        price: Number(entry.price),
      }))
      .filter((entry) => entry.size && Number.isFinite(entry.price))
  }
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((entry) => ({
        size: entry.size,
        price: Number(entry.price),
      }))
      .filter((entry) => entry.size && Number.isFinite(entry.price))
  } catch {
    return []
  }
}

const parseInventoryNumber = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    const error = new Error('Inventory values must be whole numbers of 0 or more.')
    error.statusCode = 400
    error.code = 'INVALID_INVENTORY'
    throw error
  }

  return parsed
}

const parseBooleanFlag = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false

  return fallback
}

const buildSizePrices = (product) => {
  if (product?.sizePrices?.length) return product.sizePrices
  if (product?.sizeOptions?.length && Number.isFinite(product.price)) {
    return product.sizeOptions.map((size) => ({ size, price: product.price }))
  }
  if (Number.isFinite(product?.price)) {
    return [{ size: 'Regular', price: product.price }]
  }
  return []
}

const getInventoryQuantity = (product) =>
  Number.isInteger(product?.inventoryQuantity) && product.inventoryQuantity >= 0
    ? product.inventoryQuantity
    : null

const mapProduct = (product, { includeInlineImage = false } = {}) => {
  const inventoryQuantity = getInventoryQuantity(product)
  const lowStockThreshold =
    Number.isInteger(product?.lowStockThreshold) && product.lowStockThreshold >= 0
      ? product.lowStockThreshold
      : 5

  return {
    ...product.toObject(),
    imageUrl: includeInlineImage
      ? buildInlineImageUrl(product)
      : buildProductImageUrl(product),
    sizePrices: buildSizePrices(product),
    inventoryQuantity,
    lowStockThreshold,
    inventoryTracked: inventoryQuantity !== null,
    isOutOfStock: inventoryQuantity !== null && inventoryQuantity <= 0,
    isLowStock:
      inventoryQuantity !== null &&
      inventoryQuantity > 0 &&
      inventoryQuantity <= lowStockThreshold,
    canOrder: product.isAvailable !== false && (inventoryQuantity === null || inventoryQuantity > 0),
  }
}

export const getCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  })
  const total = await Category.countDocuments()
  const categories = await Category.find().sort({ name: 1 }).skip(skip).limit(limit)
  res.json(buildPaginatedResponse(categories, total, page, limit, 'categories'))
})

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
  if (!category) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' })
  }
  res.json({ category })
})

export const createCategory = asyncHandler(async (req, res) => {
  const payload = categorySchema.parse(req.body)
  const exists = await Category.findOne({
    name: { $regex: `^${escapeRegExp(payload.name.trim())}$`, $options: 'i' },
  })
  if (exists) {
    return res
      .status(409)
      .json({ code: 'CONFLICT', message: 'Category already exists' })
  }
  const category = await Category.create(payload)
  emitRealtimeEvent(req, 'catalog:changed', {
    entity: 'category',
    action: 'created',
    entityId: String(category._id),
    category,
  })
  res.status(201).json({ category })
})

export const updateCategory = asyncHandler(async (req, res) => {
  const payload = categorySchema.partial().parse(req.body)
  if (payload.name?.trim()) {
    const exists = await Category.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: `^${escapeRegExp(payload.name.trim())}$`, $options: 'i' },
    })
    if (exists) {
      return res
        .status(409)
        .json({ code: 'CONFLICT', message: 'Category already exists' })
    }
  }
  const category = await Category.findByIdAndUpdate(req.params.id, payload, {
    new: true,
  })
  if (!category) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' })
  }
  emitRealtimeEvent(req, 'catalog:changed', {
    entity: 'category',
    action: 'updated',
    entityId: String(category._id),
    category,
  })
  res.json({ category })
})

export const deleteCategory = asyncHandler(async (req, res) => {
  const linkedProducts = await Product.countDocuments({ categoryId: req.params.id })
  if (linkedProducts > 0) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: 'Remove or reassign products in this category before deleting it',
    })
  }

  const category = await Category.findByIdAndDelete(req.params.id)
  if (!category) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' })
  }

  emitRealtimeEvent(req, 'catalog:changed', {
    entity: 'category',
    action: 'deleted',
    entityId: String(category._id),
  })
  res.json({ message: 'Category deleted' })
})

export const getProducts = asyncHandler(async (req, res) => {
  const { categoryId, search, minPrice, maxPrice } = req.query
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  })
  const query = {}

  if (categoryId) query.categoryId = categoryId
  if (search) query.name = { $regex: search, $options: 'i' }
  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = Number(minPrice)
    if (maxPrice) query.price.$lte = Number(maxPrice)
  }

  const total = await Product.countDocuments(query)
  const products = await Product.find(query)
    .select('-image.data')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const mappedProducts = products.map((product) => mapProduct(product))
  res.json(buildPaginatedResponse(mappedProducts, total, page, limit, 'products'))
})

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' })
  }
  res.json({ product: mapProduct(product, { includeInlineImage: true }) })
})

export const getProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('image')

  if (!product) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' })
  }

  if (!product?.image?.data) {
    return res.status(404).json({ code: 'NOT_FOUND' })
  }

  res.set('Cache-Control', 'public, max-age=300')
  res.contentType(product.image.contentType)
  res.send(Buffer.from(product.image.data, 'base64'))
})

export const createProduct = asyncHandler(async (req, res) => {
  const sizePrices = parseSizePrices(req.body.sizePrices)
  const sizeOptions = sizePrices.length
    ? sizePrices.map((entry) => entry.size)
    : parseList(req.body.sizeOptions)
  const basePrice = sizePrices.length
    ? Math.min(...sizePrices.map((entry) => entry.price))
    : Number(req.body.price)

  const payload = {
    categoryId: req.body.categoryId,
    name: req.body.name,
    description: req.body.description || '',
    price: Number.isFinite(basePrice) ? basePrice : 0,
    sizeOptions,
    sizePrices,
    addOns: parseList(req.body.addOns),
    isAvailable: parseBooleanFlag(req.body.isAvailable, true),
    inventoryQuantity: parseInventoryNumber(req.body.inventoryQuantity, null),
    lowStockThreshold: parseInventoryNumber(req.body.lowStockThreshold, 5),
  }

  if (req.file) {
    payload.image = {
      data: req.file.buffer.toString('base64'),
      contentType: req.file.mimetype,
    }
  }

  const product = await Product.create(payload)
  emitRealtimeEvent(req, 'catalog:changed', {
    entity: 'product',
    action: 'created',
    entityId: String(product._id),
    product: mapProduct(product, { includeInlineImage: true }),
  })
  res.status(201).json({ product: mapProduct(product, { includeInlineImage: true }) })
})

export const updateProduct = asyncHandler(async (req, res) => {
  const sizePrices = req.body.sizePrices
    ? parseSizePrices(req.body.sizePrices)
    : undefined
  const sizeOptions = sizePrices
    ? sizePrices.map((entry) => entry.size)
    : req.body.sizeOptions
    ? parseList(req.body.sizeOptions)
    : undefined
  const basePrice = req.body.price
    ? Number(req.body.price)
    : sizePrices && sizePrices.length
    ? Math.min(...sizePrices.map((entry) => entry.price))
    : undefined

  const payload = {
    name: req.body.name,
    categoryId: req.body.categoryId,
    description: req.body.description,
    price: Number.isFinite(basePrice) ? basePrice : undefined,
    sizeOptions,
    sizePrices,
    addOns: req.body.addOns ? parseList(req.body.addOns) : undefined,
    isAvailable: parseBooleanFlag(req.body.isAvailable, undefined),
    inventoryQuantity:
      req.body.inventoryQuantity !== undefined
        ? parseInventoryNumber(req.body.inventoryQuantity, null)
        : undefined,
    lowStockThreshold:
      req.body.lowStockThreshold !== undefined
        ? parseInventoryNumber(req.body.lowStockThreshold, 5)
        : undefined,
  }

  if (req.file) {
    payload.image = {
      data: req.file.buffer.toString('base64'),
      contentType: req.file.mimetype,
    }
  }

  const product = await Product.findByIdAndUpdate(req.params.id, payload, {
    new: true,
  })
  if (!product) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' })
  }
  emitRealtimeEvent(req, 'catalog:changed', {
    entity: 'product',
    action: 'updated',
    entityId: String(product._id),
    product: mapProduct(product, { includeInlineImage: true }),
  })
  res.json({ product: mapProduct(product, { includeInlineImage: true }) })
})

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' })
  }
  emitRealtimeEvent(req, 'catalog:changed', {
    entity: 'product',
    action: 'deleted',
    entityId: String(product._id),
  })
  res.json({ message: 'Product deleted' })
})
