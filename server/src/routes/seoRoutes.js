import express from 'express'
import Event from '../models/Event.js'
import Product from '../models/Product.js'

const router = express.Router()

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const normalizeBaseUrl = (req) => {
  const configuredOrigin = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean)

  const fallback = `${req.protocol}://${req.get('host')}`
  return (configuredOrigin || fallback).replace(/\/$/, '')
}

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const baseUrl = normalizeBaseUrl(req)
    const [activeProducts, activeEvents] = await Promise.all([
      Product.find({ isAvailable: true }).select('_id updatedAt').sort({ updatedAt: -1 }).lean(),
      Event.find({ isActive: true }).select('_id updatedAt').sort({ updatedAt: -1 }).lean(),
    ])

    const staticEntries = ['/', '/menu', '/events', '/gallery', '/location'].map((path) => ({
      loc: `${baseUrl}${path}`,
    }))

    const productEntries = activeProducts.map((product) => ({
      loc: `${baseUrl}/menu/${product._id}`,
      lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
    }))

    const eventEntries = activeEvents.map((event) => ({
      loc: `${baseUrl}/events?event=${event._id}`,
      lastmod: event.updatedAt ? new Date(event.updatedAt).toISOString() : undefined,
    }))

    const urls = [...staticEntries, ...productEntries, ...eventEntries]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `
    <lastmod>${entry.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`

    res.type('application/xml')
    res.send(xml)
  } catch (error) {
    next(error)
  }
})

export default router
