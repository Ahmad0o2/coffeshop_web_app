import express from 'express'
import {
  getCategories,
  getCategory,
  getProduct,
  getProducts,
} from '../controllers/catalogController.js'
import { getSettings } from '../controllers/settingsController.js'

const router = express.Router()

router.get('/categories', getCategories)
router.get('/categories/:id', getCategory)
router.get('/products', getProducts)
router.get('/products/:id', getProduct)
router.get('/settings', getSettings)

export default router
