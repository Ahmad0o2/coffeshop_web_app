# Changelog

All notable changes to Cortina.D are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added
- Arabic language support (i18n) with RTL layout — coming soon
- Payment gateway integration — coming soon

## [1.1.0] - 2026-03-21

### Added
- Socket.IO rooms by role (admin/staff/user) for targeted real-time events
- In-memory cache for settings images (logo, hero, gallery) — eliminates DB reads per request
- Singleton socket client to prevent multiple connections per page
- Token refresh with reuse detection — revokes all sessions on replay attack
- Atomic inventory updates with rollback on failure (Saga pattern)
- Pagination for orders, products, categories, events, rewards
- DB indexes on Order, Review, RewardRedemption
- SEO: react-helmet-async, dynamic sitemap.xml, robots.txt, JSON-LD structured data
- Error Boundaries on all routes
- AdminDashboard split into 8 focused sub-components
- staleTime and refetchOnWindowFocus defaults on QueryClient
- Rate limiting on auth endpoints (login, OTP)
- Multer file type validation
- Health check endpoint with DB status
- socketAuth utility for authenticated socket connections

### Fixed
- Cross-Origin-Resource-Policy header blocking images between ports
- Duplicate schema index warning on RefreshToken.expiresAt
- Socket connections multiplying per component

### Security
- Auth rate limiter: 10 requests / 15 minutes on login and OTP endpoints
- Socket rooms prevent admin data leaking to customer connections
- Helmet crossOriginResourcePolicy set to cross-origin

## [1.0.0] - 2026-03-01

### Added
- Full-stack coffee shop platform (Cortina.D)
- Customer storefront: menu, cart, checkout, order history
- Admin CMS dashboard with 8 management sections
- Real-time order updates via Socket.IO
- JWT authentication with refresh token rotation
- OTP email verification via Brevo
- Rewards and loyalty points system
- Events with registration and capacity management
- Inventory tracking with low-stock alerts
- Role-based access control (Admin / Staff / Customer)
