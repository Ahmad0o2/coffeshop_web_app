import express from 'express'
import {
  getRewardHistory,
  getRewards,
  redeemReward,
} from '../controllers/rewardController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.use(protect)

router.get('/', getRewards)
router.post('/redeem', redeemReward)
router.get('/history', getRewardHistory)

export default router
