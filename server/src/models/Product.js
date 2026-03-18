import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    sizeOptions: { type: [String], default: [] },
    sizePrices: {
      type: [
        {
          size: { type: String, required: true },
          price: { type: Number, required: true },
        },
      ],
      default: [],
    },
    addOns: { type: [String], default: [] },
    imageUrl: { type: String, default: '' },
    image: {
      data: { type: String, default: '' },
      contentType: { type: String, default: '' },
    },
    isAvailable: { type: Boolean, default: true },
    inventoryQuantity: { type: Number, default: null, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
  },
  { timestamps: true }
)

const Product = mongoose.model('Product', productSchema)

export default Product
