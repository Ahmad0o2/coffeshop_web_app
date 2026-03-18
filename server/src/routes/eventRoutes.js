import express from 'express'
import {
  getEvent,
  getEvents,
  getMyEventRegistrations,
  registerForEvent,
  unregisterFromEvent,
} from '../controllers/eventController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/', getEvents)
router.get('/registrations/me', protect, getMyEventRegistrations)
router.get('/:id', getEvent)
router.post('/:id/register', protect, registerForEvent)
router.post('/:id/unregister', protect, unregisterFromEvent)

export default router
