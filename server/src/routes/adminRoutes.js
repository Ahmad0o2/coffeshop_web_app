import express from 'express'
import { getActivityLogs } from '../controllers/activityController.js'
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  updateCategory,
  updateProduct,
} from '../controllers/catalogController.js'
import { createEvent, deleteEvent, getAdminEvents, updateEvent } from '../controllers/eventController.js'
import {
  createReward,
  deleteReward,
  getAdminRewards,
  updateReward,
} from '../controllers/rewardController.js'
import {
  deleteHomeDisplayImage,
  deleteSpaceGalleryImage,
  deleteGalleryImage,
  updateHomeDisplayImage,
  updateSpaceGalleryImage,
  updateGalleryImage,
  updateSettings,
} from '../controllers/settingsController.js'
import { createStaff, deleteStaff, getStaff, updateStaff } from '../controllers/staffController.js'
import { protect } from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import requirePermission from '../middleware/requirePermission.js'
import multer from 'multer'

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
})

router.use(protect)

router.get('/activity-logs', requireRole('Admin'), getActivityLogs)
router.get('/staff', requireRole('Admin'), getStaff)
router.post('/staff', requireRole('Admin'), createStaff)
router.patch('/staff/:id', requireRole('Admin'), updateStaff)
router.delete('/staff/:id', requireRole('Admin'), deleteStaff)

router.post('/categories', requirePermission('manageProducts'), createCategory)
router.put('/categories/:id', requirePermission('manageProducts'), updateCategory)
router.delete('/categories/:id', requirePermission('manageProducts'), deleteCategory)
router.post(
  '/products',
  requirePermission('manageProducts'),
  upload.single('image'),
  createProduct
)
router.put(
  '/products/:id',
  requirePermission('manageProducts'),
  upload.single('image'),
  updateProduct
)
router.delete('/products/:id', requirePermission('manageProducts'), deleteProduct)
router.get('/events', requirePermission('manageEvents'), getAdminEvents)
router.post('/events', requirePermission('manageEvents'), createEvent)
router.put('/events/:id', requirePermission('manageEvents'), updateEvent)
router.delete('/events/:id', requirePermission('manageEvents'), deleteEvent)
router.get('/rewards', requirePermission('manageRewards'), getAdminRewards)
router.post('/rewards', requirePermission('manageRewards'), createReward)
router.put('/rewards/:id', requirePermission('manageRewards'), updateReward)
router.delete('/rewards/:id', requirePermission('manageRewards'), deleteReward)
router.put(
  '/settings',
  requirePermission('manageBrand', 'manageEvents', 'manageProducts'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'heroImage', maxCount: 1 },
    { name: 'spaceGalleryImages', maxCount: 8 },
    { name: 'homeDisplayImages', maxCount: 8 },
    { name: 'galleryImages', maxCount: 8 },
  ]),
  updateSettings
)
router.put(
  '/settings/space-gallery/:index',
  requirePermission('manageBrand'),
  upload.single('image'),
  updateSpaceGalleryImage
)
router.delete(
  '/settings/space-gallery/:index',
  requirePermission('manageBrand'),
  deleteSpaceGalleryImage
)
router.put(
  '/settings/home-display/:index',
  requirePermission('manageBrand'),
  upload.single('image'),
  updateHomeDisplayImage
)
router.delete(
  '/settings/home-display/:index',
  requirePermission('manageBrand'),
  deleteHomeDisplayImage
)
router.put(
  '/settings/gallery/:index',
  requirePermission('manageBrand'),
  upload.single('image'),
  updateGalleryImage
)
router.delete(
  '/settings/gallery/:index',
  requirePermission('manageBrand'),
  deleteGalleryImage
)

export default router
