# Cortina.D Coffee House Web App

Cortina.D is a full-stack coffee shop platform with a customer-facing storefront, a real-time order flow, rewards, events, a gallery/location experience, and an admin CMS-style dashboard for managing content and operations.

This repository contains both parts of the app:
- `client/` -> React + Vite frontend
- `server/` -> Express + MongoDB API

## Table of Contents
- [Project Overview](#project-overview)
- [Main Features](#main-features)
- [Visual Preview](#visual-preview)
- [Current Product Decisions](#current-product-decisions)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [How to Run Locally](#how-to-run-locally)
- [Environment Variables](#environment-variables)
- [Roles and Access](#roles-and-access)
- [Important User Flows](#important-user-flows)
- [API Overview](#api-overview)
- [API Examples](#api-examples)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [Deployment Notes](#deployment-notes)
- [Additional Documentation](#additional-documentation)

## Project Overview
The app is designed for a coffee shop that needs:
- a polished public website
- a menu with product details, sizes, and add-ons
- user accounts and order history
- live order updates
- rewards and points
- events and event registration
- admin content management
- inventory-aware ordering

The dashboard is intentionally CMS-like, so non-technical staff can manage products, rewards, homepage media, events, and staff access from one place.

## Main Features
### Customer Experience
- Home page with configurable highlights and media
- Menu page with filters, product cards, and product detail pages
- Cart and checkout flow
- Order history grouped by day
- Order editing before an order becomes `Ready` or `Completed`
- Rewards and redemption history
- Events browsing and registration
- Gallery and interactive location page
- Authentication with email OTP flows

### Admin Experience
- Live orders view with grouped daily summaries
- Product and category management
- Inventory management with low-stock and out-of-stock states
- Homepage media and branding management
- Rewards and events management
- Team/staff management
- Activity log
- Mobile and desktop admin navigation

### Real-Time Features
- Socket.IO-based updates for orders and dashboard data
- Live refreshes after order status changes
- Real-time admin indicators for incoming orders and inventory warnings

## Visual Preview
These images come from the current project assets and give a quick feel for the visual direction used in the app.

<p align="center">
  <img src="client/public/photo_for_home.webp" alt="Home hero visual" width="31%" />
  <img src="client/public/loyal_card_image.webp" alt="Rewards visual" width="31%" />
  <img src="client/public/front_door.webp" alt="Location visual" width="31%" />
</p>

## Current Product Decisions
These are current app behaviors that are intentional right now:
- Checkout is `cash only` for now.
- Online/electronic payment is temporarily disabled until a payment gateway is connected.
- OTP and password reset are email-based and use Brevo.
- Inventory can be tracked per product or left open/untracked.
- Feedback is only available for the user's latest completed order.

## Tech Stack
### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router
- React Query
- Axios
- Socket.IO Client
- Framer Motion

### Backend
- Node.js
- Express 5
- MongoDB + Mongoose
- Socket.IO
- Zod
- Helmet
- CORS
- Express Rate Limit
- Multer
- bcryptjs
- JWT

## Repository Structure
```text
coffeshop_web_app/
|- client/
|  |- public/                  # static assets
|  |- src/
|  |  |- components/           # shared and feature UI
|  |  |- context/              # auth, cart, theme providers
|  |  |- hooks/                # reusable hooks
|  |  |- pages/                # route-level screens
|  |  |- services/             # API client config
|  |  |- utils/                # pricing, inventory, sessions, helpers
|  |  |- App.jsx               # app routes
|  |  \- main.jsx              # frontend entry point
|  |- .env.example
|  \- package.json
|- server/
|  |- src/
|  |  |- config/               # db config
|  |  |- constants/            # permissions and constants
|  |  |- controllers/          # route handlers
|  |  |- middleware/           # auth, permissions, errors
|  |  |- models/               # mongoose models
|  |  |- routes/               # express route modules
|  |  |- services/             # external integrations (Brevo)
|  |  |- utils/                # async helpers, realtime, seed
|  |  |- validators/           # zod schemas
|  |  |- app.js                # express app wiring
|  |  \- server.js             # server entry point
|  |- .env.example
|  \- package.json
|- README.md
\- .gitignore
```

## How to Run Locally
### 1. Install dependencies
```bash
cd server
npm install

cd ../client
npm install
```

### 2. Create environment files
Windows PowerShell:
```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

macOS / Linux:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Fill in the required environment variables
See the next section for exact variables.

### 4. Start the backend
```bash
cd server
npm run dev
```
Backend default URL:
```text
http://localhost:5000
```

### 5. Start the frontend
```bash
cd client
npm run dev
```
Frontend default URL:
```text
http://localhost:5173
```

## Environment Variables
### `server/.env`
| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Yes | API port, usually `5000` |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret |
| `CLIENT_ORIGIN` | Yes | Frontend origin for CORS and sockets |
| `BREVO_API_KEY` | Optional / required for real email OTP | Brevo transactional email API key |
| `BREVO_SENDER_EMAIL` | Optional / required for real email OTP | Verified Brevo sender email |
| `BREVO_SENDER_NAME` | Optional | Sender name shown in email OTP messages |
| `SEED_ON_START` | Optional | Enable boot-time seeding |
| `SEED_SAMPLE_DATA` | Optional | Seed demo categories/products/rewards/events |
| `ADMIN_EMAIL` | Optional | Seed or promote admin account |
| `ADMIN_PASSWORD` | Optional | Seeded admin password |
| `ADMIN_NAME` | Optional | Seeded admin display name |
| `ADMIN_PHONE` | Optional | Seeded admin phone |

### `client/.env`
| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Backend API base URL, usually `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | Yes | Socket server URL, usually `http://localhost:5000` |
| `VITE_GALLERY_IMAGES` | Optional | Optional gallery image override list |

## Roles and Access
The app currently uses these roles:
- `Customer`
- `Staff`
- `Admin`

### Admin
Admin can access:
- orders
- products and categories
- rewards
- events
- brand/home media
- inventory
- team management
- activity log

### Staff
Staff access is permission-based. Admin can grant specific permissions such as:
- `manageOrders`
- `manageProducts`
- `manageEvents`
- `manageRewards`
- `manageBrand`

## Important User Flows
### Authentication
- Sign in and registration happen on `/sign-in`
- Registration and password reset use email OTP
- Successful customer sign-in redirects to the Home page

### Orders
- Checkout creates an order and redirects to `/orders`
- Users can edit or cancel orders until they become `Ready`, `Completed`, or `Cancelled`
- Admin sees live order updates in the dashboard

### Inventory
- If tracking is enabled, orders reduce stock immediately
- Cancelled orders restore stock
- Low stock and out-of-stock products are surfaced in admin inventory views and nav indicators

### Home Content
- Home page media is managed in the admin dashboard
- Home menu highlights are selected from the live `Menu` picker

## API Overview
These are the main API groups:
- `/api/health`
- `/api/v1/auth`
- `/api/v1/orders`
- `/api/v1/reviews`
- `/api/v1/rewards`
- `/api/v1/events`
- `/api/v1/admin`
- `/api/v1/products`
- `/api/v1/categories`
- `/api/v1/settings`

### Common examples
- `POST /api/v1/auth/login` -> sign in
- `POST /api/v1/auth/register` -> register new user
- `POST /api/v1/auth/otp/request` -> send email OTP
- `POST /api/v1/auth/password-reset` -> reset password with OTP
- `POST /api/v1/orders` -> create order
- `PATCH /api/v1/orders/:id` -> edit an existing order
- `PATCH /api/v1/orders/:id/status` -> admin updates order status
- `PUT /api/v1/admin/settings` -> update home media and settings

## API Examples
These examples assume:
- backend URL: `http://localhost:5000`
- API base: `http://localhost:5000/api/v1`
- JSON requests unless stated otherwise

### 1. Register with email OTP
Request an OTP:

```bash
curl -X POST http://localhost:5000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"purpose\":\"register\"}"
```

Complete registration:

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Test User\",\"email\":\"user@example.com\",\"phone\":\"0790000000\",\"password\":\"strongpass123\",\"otp\":\"123456\"}"
```

### 2. Sign in
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"strongpass123\"}"
```

### 3. Create an order
```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"PRODUCT_ID\",\"quantity\":1,\"selectedSize\":\"Regular\",\"selectedAddOns\":[]}],\"paymentMethod\":\"Cash\",\"specialInstructions\":\"No sugar\"}"
```

### 4. Update an order before it is locked
```bash
curl -X PATCH http://localhost:5000/api/v1/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"PRODUCT_ID\",\"quantity\":2,\"selectedSize\":\"Large\",\"selectedAddOns\":[\"Extra Shot\"]}],\"specialInstructions\":\"Less ice\"}"
```

### 5. Reset a password with OTP
Request reset OTP:

```bash
curl -X POST http://localhost:5000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"purpose\":\"reset-password\"}"
```

Reset password:

```bash
curl -X POST http://localhost:5000/api/v1/auth/password-reset \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"otp\":\"123456\",\"newPassword\":\"newstrongpass123\"}"
```

## Useful Commands
### Frontend
```bash
cd client
npm run dev
npm run lint
npm run build
npm run preview
```

### Backend
```bash
cd server
npm run dev
npm start
```

## Troubleshooting
### The frontend cannot reach the backend
Check:
- backend is running
- `VITE_API_URL` is correct
- `VITE_SOCKET_URL` is correct
- `CLIENT_ORIGIN` in `server/.env` matches the frontend URL

### MongoDB connection fails
Check:
- `MONGO_URI` is valid
- your MongoDB user credentials are correct
- your Atlas/network access rules allow your machine

### OTP email is not arriving
Check:
- `BREVO_API_KEY` is valid
- `BREVO_SENDER_EMAIL` is verified in Brevo
- spam/junk folder
- server logs for Brevo errors

### Admin dashboard is not visible
Check that the user role is:
- `Admin`
- or `Staff` with the right permissions for the section being accessed

### Build fails with a locked file in `client/dist`
On Windows this can happen if a file inside `dist/` is locked by another process.
Fix options:
- close the process using the file
- delete `client/dist`
- run the build again

## Deployment Notes
- Do not commit real `.env` files
- Only `.env.example` files should be tracked
- Set production-safe values for all backend and frontend environment variables
- Make sure `CLIENT_ORIGIN` matches the deployed frontend domain
- Replace local MongoDB values with production MongoDB values
- Add a real payment gateway before re-enabling online card payment

## Additional Documentation
- `client/README.md` -> frontend-specific setup and structure
- `server/README.md` -> backend-specific setup and route notes
