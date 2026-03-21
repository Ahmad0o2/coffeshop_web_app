# Client Documentation

This folder contains the React frontend for Cortina.D.

## What the Client Does
The frontend covers all public and customer-facing screens plus the admin dashboard UI.

Main responsibilities:
- render the storefront and content pages
- fetch data from the backend API
- manage auth, cart, theme, and realtime UI state
- provide the admin dashboard interface
- handle checkout, order history, rewards, events, and location flows

## Tech Stack
- React 19
- Vite
- Tailwind CSS
- React Router
- React Query
- Axios
- Socket.IO Client
- Framer Motion

## Important Entry Points
- `client/src/main.jsx` -> app bootstrap
- `client/src/App.jsx` -> routing
- `client/src/layouts/MainLayout.jsx` -> shared layout shell
- `client/src/services/api.js` -> API client configuration

## Folder Guide
```text
client/
|- public/                  # static assets shipped as-is
|- src/
|  |- components/           # shared UI and feature components
|  |- context/              # auth, cart, and theme providers
|  |- hooks/                # reusable hooks
|  |- layouts/              # layout wrappers
|  |- lib/                  # shared utility helpers
|  |- pages/                # route-level screens
|  |- services/             # axios setup and service calls
|  |- utils/                # pricing, inventory, sessions, helpers
|  |- App.jsx
|  \- main.jsx
|- .env.example
|- package.json
\- vite.config.js
```

## Main Pages
- `/` -> Home
- `/menu` -> menu listing
- `/menu/:id` -> product detail
- `/cart` -> cart
- `/checkout` -> checkout
- `/orders` -> customer order history
- `/rewards` -> rewards page
- `/events` -> events page
- `/gallery` -> gallery page
- `/location` -> location page
- `/sign-in` -> sign in / register / reset password
- `/admin` -> admin dashboard

## Environment
Create `client/.env` from `client/.env.example`.

Recommended local values:
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
VITE_GALLERY_IMAGES=
```

## Local Development
### Install
```bash
cd client
npm install
```

### Start dev server
```bash
npm run dev
```

Default local frontend URL:
```text
http://localhost:5173
```

## Available Scripts
```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Key Frontend Flows
### Authentication
- Auth UI lives on `/sign-in`
- Registration uses email OTP
- Password reset also uses email OTP
- Auth state is stored in local storage and exposed through context/hooks

### Cart and Checkout
- Cart state is managed through `CartContext`
- Checkout currently supports `cash only`
- After checkout, the user is redirected to `/orders`

### Orders
- Order history is grouped by day
- Users can edit or cancel eligible orders
- Feedback can be sent after eligible completed orders

### Admin Dashboard
The admin UI includes:
- orders
- products and categories
- rewards
- events
- home media and branding
- inventory
- staff management
- activity log

## Realtime Notes
Socket.IO is used for:
- order updates
- dashboard refreshes
- rewards-related refresh behavior
- settings-related refresh behavior

Make sure `VITE_SOCKET_URL` matches the backend URL.

## Common Files You Will Touch
- `client/src/pages/Home.jsx`
- `client/src/pages/Menu.jsx`
- `client/src/pages/Checkout.jsx`
- `client/src/pages/Profile.jsx`
- `client/src/pages/AdminDashboard.jsx`
- `client/src/components/common/Navbar.jsx`
- `client/src/context/AuthContext.jsx`
- `client/src/context/CartContext.jsx`
- `client/src/context/ThemeContext.jsx`

## Troubleshooting
### API calls fail
Check:
- backend is running
- `VITE_API_URL` is correct
- auth token is present for protected routes

### Realtime data is not updating
Check:
- `VITE_SOCKET_URL`
- backend socket server is running
- CORS origin matches the frontend URL

### Build fails on Windows because of a locked file
If a file in `client/dist/` is locked:
- close the process using the file
- delete `client/dist`
- rebuild

## Frontend Notes
- The app uses Tailwind utility classes extensively, so most styling lives inline in components/pages.
- Route protection is based on auth state and role/permission checks.
- The admin mobile navigation intentionally differs from desktop navigation.
