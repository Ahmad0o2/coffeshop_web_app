import mongoose from 'mongoose'

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI

  mongoose.set('strictQuery', true)

  if (!mongoUri) {
    throw new Error('MONGO_URI is required. Please set it in server/.env')
  }

  await mongoose.connect(mongoUri)
  console.log('MongoDB connected')
}

export default connectDB
