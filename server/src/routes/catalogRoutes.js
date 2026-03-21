import express from 'express'
import {
  getCategories,
  getCategory,
  getProductImage,
  getProduct,
  getProducts,
} from '../controllers/catalogController.js'
import {
  getGalleryImage,
  getHeroImage,
  getHomeDisplayImage,
  getLogoImage,
  getSettings,
  getSpaceGalleryImage,
} from '../controllers/settingsController.js'

const router = express.Router()

router.get('/categories', getCategories)
router.get('/categories/:id', getCategory)
router.get('/products', getProducts)
router.get('/products/:id/image', getProductImage)
router.get('/products/:id', getProduct)
router.get('/settings', getSettings)
router.get('/settings/image/logo', getLogoImage)
router.get('/settings/image/hero', getHeroImage)
router.get('/settings/image/gallery/:index', getGalleryImage)
router.get('/settings/image/home-display/:index', getHomeDisplayImage)
router.get('/settings/image/space-gallery/:index', getSpaceGalleryImage)

export default router
