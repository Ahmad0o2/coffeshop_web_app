import mongoose from 'mongoose'

const tableSchema = new mongoose.Schema(
  {
    tableNumber: { type: String, required: true, unique: true },
    seats: { type: Number, default: 2 },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Reserved'],
      default: 'Available',
    },
  },
  { timestamps: true }
)

const Table = mongoose.model('Table', tableSchema)

export default Table
