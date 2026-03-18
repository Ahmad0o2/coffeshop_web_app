# Server API

Backend for the Cortina.D Coffee House web app.

## Stack

- Node.js
- Express 5
- MongoDB + Mongoose
- Socket.IO
- Zod validation
- Helmet
- CORS
- Express rate limit

## Environment

Create:

```text
server/.env
```

From:

```text
server/.env.example
```

Required variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
CLIENT_ORIGIN=http://localhost:5173
```

Optional seed variables:

```env
SEED_ON_START=false
SEED_SAMPLE_DATA=false
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=Cortina Admin
ADMIN_PHONE=
```

## Install

```bash
cd server
npm install
```

## Run In Development

```bash
npm run dev
```

## Run In Production Mode

```bash
npm start
```

Default local URL:

```text
http://localhost:5000
```

Health check:

```text
GET /api/health
```

## Server Entry Points

- `server/src/server.js`
- `server/src/app.js`

## Main Responsibilities

- Authentication and profile updates
- Menu/catalog and category data
- Orders and order status updates
- Rewards and redemptions
- Events and registrations
- Reviews
- Admin CMS operations
- Realtime order updates through Socket.IO
- Inventory-aware product ordering

## API Route Groups

- `/api/v1/auth`
- `/api/v1/orders`
- `/api/v1/reviews`
- `/api/v1/rewards`
- `/api/v1/events`
- `/api/v1/admin`
- `/api/v1/products`
- `/api/v1/categories`
- `/api/v1/settings`

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

## Important Notes

- Protected routes use bearer token auth
- Admin routes use role and permission middleware
- Uploaded images are handled with `multer`
- Socket.IO uses `CLIENT_ORIGIN` for CORS

## Useful Folders

- `server/src/controllers`
- `server/src/models`
- `server/src/routes`
- `server/src/middleware`
- `server/src/validators`
- `server/src/utils`
