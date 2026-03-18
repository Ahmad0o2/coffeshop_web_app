import http from 'http'
import dotenv from 'dotenv'
import { Server as SocketIOServer } from 'socket.io'
import app from './app.js'
import connectDB from './config/db.js'
import seedData from './utils/seed.js'

dotenv.config()

const PORT = process.env.PORT || 5000

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
  },
})

app.set('io', io)

io.on('connection', (socket) => {
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
