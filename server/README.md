# Server Documentation

This folder contains the Express + MongoDB backend for Cortina.D.

## What the Server Does
The backend is responsible for:
- authentication and profile data
- email OTP registration and password reset
- categories, products, and settings
- orders and realtime order events
- rewards and reward redemption history
- events and registrations
- reviews
- admin CMS operations
- staff account management
- inventory-aware ordering

## Tech Stack
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

## Entry Points
- `server/src/server.js` -> starts the server and DB connection
- `server/src/app.js` -> configures Express routes and middleware

## Folder Guide
```text
server/
|- src/
|  |- config/               # database connection
|  |- constants/            # permission constants
|  |- controllers/          # request handlers
|  |- middleware/           # auth, role, permission, error handling
|  |- models/               # mongoose models
|  |- routes/               # express route modules
|  |- services/             # external integrations (Brevo email)
|  |- utils/                # async helpers, realtime emitters, seed logic
|  |- validators/           # zod schemas
|  |- app.js
|  \- server.js
|- .env.example
\- package.json
```

## Environment
Create `server/.env` from `server/.env.example`.

### Required variables
```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
CLIENT_ORIGIN=http://localhost:5173
```

### Optional email OTP / Brevo variables
```env
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Cortina.D
```

### Optional seed variables
```env
SEED_ON_START=false
SEED_SAMPLE_DATA=false
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=Cortina Admin
ADMIN_PHONE=
```

## Local Development
### Install
```bash
cd server
npm install
```

### Run in development
```bash
npm run dev
```

### Run in production mode
```bash
npm start
```

Default backend URL:
```text
http://localhost:5000
```

Health check:
```text
GET /api/health
```

## Main Route Groups
- `/api/v1/auth`
- `/api/v1/orders`
- `/api/v1/reviews`
- `/api/v1/rewards`
- `/api/v1/events`
- `/api/v1/admin`
- `/api/v1/products`
- `/api/v1/categories`
- `/api/v1/settings`

## Important Server Behaviors
### Authentication
- JWT-based auth
- Profile endpoints for the authenticated user
- Email OTP for registration and password reset

### Orders
- Orders are created from cart items and optional reward redemptions
- Realtime events are emitted when orders are created, updated, cancelled, or completed
- Users can edit eligible orders until they reach non-editable states

### Inventory
- Inventory is enforced at order creation and order editing time
- If inventory tracking is enabled, stock is reserved immediately
- Cancelling an eligible order restores stock
- Out-of-stock and low-stock conditions are surfaced to the client and admin UI

### Rewards
- Reward redemptions are tied to user accounts
- Redeemed rewards can be applied during checkout
- Applied rewards are restored if the order fails or is cancelled in eligible states

### Staff and Admin
- Admin can create or update staff accounts
- Staff permissions are filtered through the allowed permissions list
- Password changes for staff are validated and hashed server-side

## Realtime Events
Socket.IO events are used for:
- `order:new`
- `order:status`
- `order:updated`
- `order:feedback`
- `settings:changed`
- `staff:changed`

## Security and Validation Notes
- Input validation is done with Zod in `server/src/validators`
- Passwords are hashed with bcryptjs
- Protected routes use bearer token auth
- Role and permission middleware protect admin routes
- Rate limiting and Helmet are enabled in the app

## Seed Behavior
Seeding only runs when:
```env
SEED_ON_START=true
```

If `SEED_SAMPLE_DATA=true`, the server can seed:
- categories
- products
- rewards
- events

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, the server can create or promote an admin account on startup.

## Common Files You Will Touch
- `server/src/controllers/authController.js`
- `server/src/controllers/orderController.js`
- `server/src/controllers/catalogController.js`
- `server/src/controllers/settingsController.js`
- `server/src/controllers/staffController.js`
- `server/src/routes/adminRoutes.js`
- `server/src/routes/authRoutes.js`
- `server/src/models/Order.js`
- `server/src/models/Product.js`
- `server/src/validators/order.js`
- `server/src/validators/staff.js`

## Troubleshooting
### MongoDB does not connect
Check:
- `MONGO_URI`
- database credentials
- network access / IP allow list

### OTP emails are not sent
Check:
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- whether the sender is verified in Brevo
- server logs for provider errors

### Auth works but realtime does not
Check:
- socket server is running
- `CLIENT_ORIGIN` matches the frontend origin
- frontend `VITE_SOCKET_URL` matches this backend

### Orders fail unexpectedly
Check:
- inventory availability
- reward redemption status
- payload validation errors
- whether an unsupported payment method was sent

## Notes
- Real `.env` files should never be committed.
- Uploaded media and settings updates flow through admin routes.
- Checkout is intentionally cash-only until a real payment gateway is added.
