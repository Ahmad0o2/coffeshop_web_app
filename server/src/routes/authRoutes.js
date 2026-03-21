import express from 'express'
import {
  getProfile,
  login,
  logout,
  refreshSession,
  register,
  requestOtp,
  resetPassword,
  updateProfile,
} from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.post('/otp/request', requestOtp)
router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refreshSession)
router.post('/logout', logout)
router.post('/password-reset', resetPassword)
router.get('/profile', protect, getProfile)
router.put('/profile', protect, updateProfile)

export default router
