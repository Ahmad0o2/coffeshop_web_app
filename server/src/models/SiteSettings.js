import mongoose from 'mongoose'

const imageSchema = new mongoose.Schema(
  {
    data: { type: String, default: '' },
    contentType: { type: String, default: '' },
  },
  { _id: false }
)

const siteSettingsSchema = new mongoose.Schema(
  {
    logo: imageSchema,
    heroImage: imageSchema,
    spaceGalleryImages: { type: [imageSchema], default: [] },
    homeDisplayImages: { type: [imageSchema], default: [] },
    galleryImages: { type: [imageSchema], default: [] },
    featuredEventIds: { type: [String], default: [] },
    todaysSpecialProductId: { type: String, default: '' },
    featuredProductIds: { type: [String], default: [] },
  },
  { timestamps: true }
)

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema)

export default SiteSettings
