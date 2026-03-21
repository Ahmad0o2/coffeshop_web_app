import http from 'http'
import dotenv from 'dotenv'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import connectDB from './config/db.js'
import {
  ADMIN_SOCKET_ROOM,
  PUBLIC_SOCKET_ROOM,
  buildUserSocketRoom,
} from './utils/realtime.js'
import seedData from './utils/seed.js'

dotenv.config()

const PORT = process.env.PORT || 5000
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by Socket.IO CORS'))
    },
    credentials: true,
  },
})

app.set('io', io)

io.on('connection', (socket) => {
  const auth = socket.handshake.auth || {}
  const userId = auth.userId ? String(auth.userId) : ''
  const role = typeof auth.role === 'string' ? auth.role : ''

  socket.join(PUBLIC_SOCKET_ROOM)

  if (userId) {
    socket.join(buildUserSocketRoom(userId))
  }

  if (role === 'Admin' || role === 'Staff') {
    socket.join(ADMIN_SOCKET_ROOM)
  }

  console.log('Socket connected', socket.id)
  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
  })
})

connectDB()
  .then(() => {
    return seedData()
  })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect DB', err)
    process.exit(1)
  })
