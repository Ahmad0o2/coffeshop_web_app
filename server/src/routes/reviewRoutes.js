import express from 'express'
import { addReview, getReviews } from '../controllers/reviewController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/', getReviews)
router.post('/', protect, addReview)

export default router
