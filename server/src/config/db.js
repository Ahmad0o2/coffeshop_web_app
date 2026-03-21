import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI

  mongoose.set('strictQuery', true)

  if (!mongoUri) {
    throw new Error('MONGO_URI is required. Please set it in server/.env')
  }

  await mongoose.connect(mongoUri)
  logger.info('MongoDB connected')
}

export default connectDB
