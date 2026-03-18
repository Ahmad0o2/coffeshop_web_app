# Cortina.D Coffee House Web App

A full-stack coffee shop ordering platform with a React frontend, an Express + MongoDB API, real-time order updates, rewards, events, gallery/location pages, and an admin CMS-style dashboard.

## What This Project Includes

- Customer-facing storefront
- Product menu with categories, sizes, add-ons, and product detail pages
- Cart and checkout flow
- Live order status updates
- Rewards and points system
- Events and event registration
- Gallery and location pages
- Admin dashboard for products, rewards, events, homepage media, activity log, and inventory
- Inventory-aware ordering with low-stock and out-of-stock handling

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, React Router, React Query
- Backend: Node.js, Express 5, MongoDB, Mongoose, Socket.IO
- Validation and security: Zod, Helmet, CORS, rate limiting

## Project Structure

```text
coffeshop_web_app/
|- client/   # React frontend
|- server/   # Express + MongoDB backend
|- .gitignore
\- README.md
```

## Main Routes

### Frontend

- `/` Home
- `/menu` Menu
- `/menu/:id` Product details
- `/cart` Cart
- `/checkout` Checkout
- `/orders` Profile / order history
- `/orders/:id` Order status
- `/rewards` Rewards
- `/points` Redemption history / points page
- `/events` Events
- `/gallery` Gallery
- `/location` Location
- `/admin` Admin dashboard
- `/admin/activity` Admin activity log

### Backend API

- `/api/health`
- `/api/v1/auth`
- `/api/v1/orders`
- `/api/v1/reviews`
- `/api/v1/rewards`
- `/api/v1/events`
- `/api/v1/admin`
- `/api/v1/...` catalog routes mounted from `catalogRoutes.js`

## API Reference

### Auth

| Method | Route                   | Purpose                         |
| ------ | ----------------------- | ------------------------------- |
| `POST` | `/api/v1/auth/register` | Register a new user             |
| `POST` | `/api/v1/auth/login`    | Login and receive an auth token |
| `GET`  | `/api/v1/auth/profile`  | Get current user profile        |
| `PUT`  | `/api/v1/auth/profile`  | Update current user profile     |

### Catalog

| Method | Route                    | Purpose                              |
| ------ | ------------------------ | ------------------------------------ |
| `GET`  | `/api/v1/categories`     | List categories                      |
| `GET`  | `/api/v1/categories/:id` | Get one category                     |
| `GET`  | `/api/v1/products`       | List products                        |
| `GET`  | `/api/v1/products/:id`   | Get one product                      |
| `GET`  | `/api/v1/settings`       | Get site settings and homepage media |

### Orders

| Method   | Route                              | Purpose                              |
| -------- | ---------------------------------- | ------------------------------------ |
| `POST`   | `/api/v1/orders`                   | Create a new order                   |
| `GET`    | `/api/v1/orders`                   | List the authenticated user's orders |
| `GET`    | `/api/v1/orders/:id`               | Get one order                        |
| `PATCH`  | `/api/v1/orders/:id/status`        | Update order status                  |
| `POST`   | `/api/v1/orders/:id/cancel`        | Cancel an order                      |
| `DELETE` | `/api/v1/orders/:id/items/:itemId` | Remove an item from an order         |

### Rewards

| Method | Route                     | Purpose                |
| ------ | ------------------------- | ---------------------- |
| `GET`  | `/api/v1/rewards`         | List rewards           |
| `POST` | `/api/v1/rewards/redeem`  | Redeem a reward        |
| `GET`  | `/api/v1/rewards/history` | Get redemption history |

### Events

| Method | Route                             | Purpose                    |
| ------ | --------------------------------- | -------------------------- |
| `GET`  | `/api/v1/events`                  | List public events         |
| `GET`  | `/api/v1/events/:id`              | Get one event              |
| `GET`  | `/api/v1/events/registrations/me` | Get my event registrations |
| `POST` | `/api/v1/events/:id/register`     | Register for an event      |
| `POST` | `/api/v1/events/:id/unregister`   | Unregister from an event   |

### Reviews

| Method | Route             | Purpose      |
| ------ | ----------------- | ------------ |
| `GET`  | `/api/v1/reviews` | List reviews |
| `POST` | `/api/v1/reviews` | Add a review |

### Admin

| Method   | Route                                         | Purpose                         |
| -------- | --------------------------------------------- | ------------------------------- |
| `GET`    | `/api/v1/admin/activity-logs`                 | List activity logs              |
| `GET`    | `/api/v1/admin/staff`                         | List staff accounts             |
| `POST`   | `/api/v1/admin/staff`                         | Create a staff account          |
| `PATCH`  | `/api/v1/admin/staff/:id`                     | Update a staff account          |
| `DELETE` | `/api/v1/admin/staff/:id`                     | Delete a staff account          |
| `POST`   | `/api/v1/admin/categories`                    | Create category                 |
| `PUT`    | `/api/v1/admin/categories/:id`                | Update category                 |
| `DELETE` | `/api/v1/admin/categories/:id`                | Delete category                 |
| `POST`   | `/api/v1/admin/products`                      | Create product                  |
| `PUT`    | `/api/v1/admin/products/:id`                  | Update product                  |
| `DELETE` | `/api/v1/admin/products/:id`                  | Delete product                  |
| `GET`    | `/api/v1/admin/events`                        | List events for admin           |
| `POST`   | `/api/v1/admin/events`                        | Create event                    |
| `PUT`    | `/api/v1/admin/events/:id`                    | Update event                    |
| `DELETE` | `/api/v1/admin/events/:id`                    | Delete event                    |
| `GET`    | `/api/v1/admin/rewards`                       | List rewards for admin          |
| `POST`   | `/api/v1/admin/rewards`                       | Create reward                   |
| `PUT`    | `/api/v1/admin/rewards/:id`                   | Update reward                   |
| `DELETE` | `/api/v1/admin/rewards/:id`                   | Delete reward                   |
| `PUT`    | `/api/v1/admin/settings`                      | Update site settings and media  |
| `PUT`    | `/api/v1/admin/settings/space-gallery/:index` | Replace one space gallery image |
| `DELETE` | `/api/v1/admin/settings/space-gallery/:index` | Delete one space gallery image  |
| `PUT`    | `/api/v1/admin/settings/home-display/:index`  | Replace one home media image    |
| `DELETE` | `/api/v1/admin/settings/home-display/:index`  | Delete one home media image     |
| `PUT`    | `/api/v1/admin/settings/gallery/:index`       | Replace one gallery image       |
| `DELETE` | `/api/v1/admin/settings/gallery/:index`       | Delete one gallery image        |

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+ installed
- npm installed
- A MongoDB database connection string

## Quick Start

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Create environment files

Create these files from the examples:

```bash
server/.env
client/.env
```

Copy the example values first:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

### 3. Fill in the required environment variables

#### `server/.env`

| Variable           | Required | Description                                                     |
| ------------------ | -------- | --------------------------------------------------------------- |
| `PORT`             | Yes      | API server port, usually `5000`                                 |
| `MONGO_URI`        | Yes      | MongoDB connection string                                       |
| `JWT_SECRET`       | Yes      | Secret used to sign auth tokens                                 |
| `CLIENT_ORIGIN`    | Yes      | Frontend origin, usually `http://localhost:5173`                |
| `SEED_ON_START`    | No       | Set to `true` to seed admin/sample data on startup              |
| `SEED_SAMPLE_DATA` | No       | Set to `true` to seed sample categories/products/rewards/events |
| `ADMIN_EMAIL`      | No       | Admin email to create or promote during seeding                 |
| `ADMIN_PASSWORD`   | No       | Admin password used during seeding                              |
| `ADMIN_NAME`       | No       | Optional seeded admin display name                              |
| `ADMIN_PHONE`      | No       | Optional seeded admin phone                                     |

#### `client/.env`

| Variable              | Required | Description                          |
| --------------------- | -------- | ------------------------------------ |
| `VITE_API_URL`        | Yes      | Backend API base URL                 |
| `VITE_SOCKET_URL`     | Yes      | Backend socket server URL            |
| `VITE_GALLERY_IMAGES` | No       | Optional gallery image override list |

### 4. Start the backend

```bash
cd server
npm run dev
```

The API will start on:

```text
http://localhost:5000
```

### 5. Start the frontend

```bash
cd client
npm run dev
```

The app will start on:

```text
http://localhost:5173
```

## Available Scripts

### Frontend (`client/package.json`)

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Backend (`server/package.json`)

```bash
npm run dev
npm start
```

## Admin and Staff Access

The app supports these user roles:

- `Customer`
- `Staff`
- `Admin`

### Option 1: Seed an admin automatically

Set the optional admin variables in `server/.env`:

```env
SEED_ON_START=true
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-password
ADMIN_NAME=Cortina Admin
```

Then start the server. If the account already exists, it will be promoted to `Admin`.

### Option 2: Promote a registered user manually

Register a normal user first, then update the `role` field in MongoDB to:

```text
Admin
```

or:

```text
Staff
```

## Inventory Notes

Inventory is product-based.

- `inventoryQuantity = null` means open inventory / not tracked
- Low stock is controlled by `lowStockThreshold`
- Orders reduce tracked stock
- Cancelled orders can restore reserved stock
- Out-of-stock products are blocked from ordering

## Real-Time Updates

The backend uses Socket.IO for live updates such as:

- order status changes
- order-related UI refreshes
- points/reward related refresh behavior

Make sure `VITE_SOCKET_URL` in `client/.env` matches the running backend.

## Recommended Development Workflow

### Backend terminal

```bash
cd server
npm run dev
```

### Frontend terminal

```bash
cd client
npm run dev
```

## Troubleshooting

### Frontend cannot reach backend

Check:

- `server` is running
- `VITE_API_URL` points to `http://localhost:5000/api/v1`
- `VITE_SOCKET_URL` points to `http://localhost:5000`
- `CLIENT_ORIGIN` in `server/.env` matches the frontend URL

### MongoDB connection fails

Check:

- `MONGO_URI` is valid
- your MongoDB network access settings allow your machine
- your database user credentials are correct

### Admin dashboard is not visible

Check that the signed-in account has role:

- `Admin`
- or `Staff`

### Seeded admin is not created

Check that:

- `SEED_ON_START=true`
- `ADMIN_EMAIL` is set
- `ADMIN_PASSWORD` is set

## Notes for Deployment

- Do not commit real `.env` files
- Only `.env.example` files are tracked
- Set production values for:
  - backend environment variables
  - frontend `VITE_*` variables
  - `CLIENT_ORIGIN`
  - MongoDB connection

## Repository Hygiene

This repository is configured to ignore:

- `.env` files
- `node_modules`
- build output
- log files

Only example environment files are committed:

- `client/.env.example`
- `server/.env.example`

## Extra Documentation

- `client/README.md` for frontend setup and structure
- `server/README.md` for backend setup and server notes
