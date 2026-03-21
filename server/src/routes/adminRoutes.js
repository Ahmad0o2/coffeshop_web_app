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
import { fileTypeFromBuffer } from 'file-type'
import multer from 'multer'

const router = express.Router()
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const createUploadValidationError = (message, code = 'INVALID_FILE_TYPE') => {
  const error = new Error(message)
  error.statusCode = 400
  error.code = code
  return error
}

const fileFilter = (_req, file, callback) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    callback(
      createUploadValidationError(
        'Only JPEG, PNG, and WEBP images are allowed.'
      )
    )
    return
  }

  callback(null, true)
}

const collectUploadedFiles = (req) => {
  if (req.file) return [req.file]
  if (Array.isArray(req.files)) return req.files
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat()
  }
  return []
}

const validateUploadedImages = async (req, res, next) => {
  const files = collectUploadedFiles(req)

  if (!files.length) {
    next()
    return
  }

  try {
    for (const file of files) {
      const detectedFileType = await fileTypeFromBuffer(file.buffer)

      if (!detectedFileType || !ALLOWED_IMAGE_MIME_TYPES.has(detectedFileType.mime)) {
        return next(
          createUploadValidationError(
            'Uploaded files must be real JPEG, PNG, or WEBP images.'
          )
        )
      }

      if (detectedFileType.mime !== file.mimetype) {
        return next(
          createUploadValidationError(
            'The uploaded image type does not match its file contents.'
          )
        )
      }

      file.mimetype = detectedFileType.mime
    }

    next()
  } catch (error) {
    next(error)
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
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
  validateUploadedImages,
  createProduct
)
router.put(
  '/products/:id',
  requirePermission('manageProducts'),
  upload.single('image'),
  validateUploadedImages,
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
  validateUploadedImages,
  updateSettings
)
router.put(
  '/settings/space-gallery/:index',
  requirePermission('manageBrand'),
  upload.single('image'),
  validateUploadedImages,
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
  validateUploadedImages,
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
  validateUploadedImages,
  updateGalleryImage
)
router.delete(
  '/settings/gallery/:index',
  requirePermission('manageBrand'),
  deleteGalleryImage
)

export default router
