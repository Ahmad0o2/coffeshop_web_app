import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/authRoutes.js'
import catalogRoutes from './routes/catalogRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import rewardRoutes from './routes/rewardRoutes.js'
import eventRoutes from './routes/eventRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import seoRoutes from './routes/seoRoutes.js'
import { errorHandler, notFound } from './middleware/error.js'

const app = express()
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many attempts, try again later.',
  },
})

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)
app.use(morgan('dev'))
app.use(express.json({ limit: '1mb' }))

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
)

app.use('/api/v1/auth/login', authLimiter)
app.use('/api/v1/auth/otp', authLimiter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/', (req, res) => {
  res.json({ status: 'ok', name: 'Cortina.D API' })
})

app.use('/', seoRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1', catalogRoutes)
app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/reviews', reviewRoutes)
app.use('/api/v1/rewards', rewardRoutes)
app.use('/api/v1/events', eventRoutes)
app.use('/api/v1/admin', adminRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
