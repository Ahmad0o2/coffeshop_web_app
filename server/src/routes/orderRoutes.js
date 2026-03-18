import express from 'express'
import {
  cancelOrder,
  createOrder,
  deleteOrderItem,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from '../controllers/orderController.js'
import { protect } from '../middleware/auth.js'
import requirePermission from '../middleware/requirePermission.js'

const router = express.Router()

router.use(protect)

router.post('/', createOrder)
router.get('/', getOrders)
router.get('/:id', getOrderById)
router.patch('/:id/status', requirePermission('manageOrders'), updateOrderStatus)
router.post('/:id/cancel', cancelOrder)
router.delete('/:id/items/:itemId', deleteOrderItem)

export default router
