import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import Reward from '../models/Reward.js'
import Event from '../models/Event.js'

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const fullName = process.env.ADMIN_NAME || 'Admin User'
  const phone = process.env.ADMIN_PHONE || ''

  if (!email || !password) return

  const existing = await User.findOne({ email })
  if (existing) {
    existing.role = 'Admin'
    existing.fullName = fullName
    if (phone) existing.phone = phone
    const passwordHash = await bcrypt.hash(password, 10)
    existing.passwordHash = passwordHash
    await existing.save()
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await User.create({
    role: 'Admin',
    fullName,
    email,
    phone,
    passwordHash,
  })
}

const seedSampleData = async () => {
  const categoryCount = await Category.countDocuments()
  if (categoryCount > 0) return

  const categories = await Category.insertMany([
    { name: 'Coffee', description: 'Signature espresso and brews' },
    { name: 'Tea', description: 'Herbal and classic blends' },
    { name: 'Dessert', description: 'Sweet bites and pastries' },
  ])

  const [coffee, tea, dessert] = categories

  await Product.insertMany([
    {
      categoryId: coffee._id,
      name: 'Cortina Signature Latte',
      description: 'Espresso, oat milk, caramel cloud.',
      price: 2.5,
      sizeOptions: ['Small', 'Regular', 'Large'],
      sizePrices: [
        { size: 'Small', price: 2.0 },
        { size: 'Regular', price: 2.5 },
        { size: 'Large', price: 3.0 },
      ],
      addOns: ['Extra shot', 'Vanilla', 'Caramel'],
    },
    {
      categoryId: coffee._id,
      name: 'Mocha Velvet',
      description: 'Deep cocoa with smooth espresso.',
      price: 2.7,
      sizeOptions: ['Small', 'Regular', 'Large'],
      sizePrices: [
        { size: 'Small', price: 2.2 },
        { size: 'Regular', price: 2.7 },
        { size: 'Large', price: 3.2 },
      ],
      addOns: ['Whipped cream', 'Extra cocoa'],
    },
    {
      categoryId: tea._id,
      name: 'Mint Breeze',
      description: 'Refreshing mint tea with citrus.',
      price: 2.0,
      sizeOptions: ['Regular', 'Large'],
      sizePrices: [
        { size: 'Regular', price: 2.0 },
        { size: 'Large', price: 2.6 },
      ],
      addOns: ['Honey'],
    },
    {
      categoryId: dessert._id,
      name: 'Date & Walnut Cake',
      description: 'Soft, rich, and perfect with coffee.',
      price: 2.9,
    },
  ])

  await Reward.insertMany([
    { title: 'Free Espresso Shot', description: 'Boost your drink.', pointsRequired: 50 },
    { title: 'Free Cookie', description: 'Sweet reward for loyal guests.', pointsRequired: 80 },
    { title: 'Free Latte', description: 'Our signature drink on us.', pointsRequired: 150 },
  ])

  const now = new Date()
  await Event.insertMany([
    {
      title: 'Latte Art Night',
      description: 'Watch and learn latte art basics.',
      startDateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      capacity: 30,
    },
    {
      title: 'Study Jam Session',
      description: 'Quiet study space with warm drinks.',
      startDateTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      endDateTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      capacity: 40,
    },
  ])
}

const seedData = async () => {
  if (process.env.SEED_ON_START !== 'true') return
  await seedAdmin()
  if (process.env.SEED_SAMPLE_DATA === 'true') {
    await seedSampleData()
  }
}

export default seedData
