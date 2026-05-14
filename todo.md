# Grocery Supply App - Project TODO

## Phase 1: Project Setup & Branding
- [x] Generate app logo and update branding (icon, splash, favicon)
- [x] Update app.config.ts with app name and branding
- [x] Configure theme colors in theme.config.js
- [x] Set up project structure and navigation

## Phase 2: Backend Setup & Database
- [x] Create database schema (users, products, orders, cart)
- [x] Set up database migrations
- [x] Create database query functions
- [x] Set up tRPC API routes (profile, products, orders, cart)
- [x] Implement file upload for product images
- [x] Set up push notifications

## Phase 3: Authentication & User Management
- [x] Implement user registration (Provider and Buyer roles)
- [x] Implement user login with role-based routing
- [x] Create authentication context/provider
- [x] Implement logout functionality
- [x] Add profile setup screens (business name, location, contact)
- [x] Implement role-based navigation (Provider vs Buyer tabs)

## Phase 4: Provider Features - Product Management
- [x] Create product management screen (list view)
- [x] Implement add product functionality (form with image upload)
- [x] Implement edit product functionality
- [x] Implement delete product functionality
- [x] Add stock status toggle (In Stock / Out of Stock)
- [x] Implement product image upload to server
- [x] Create product detail view for provider

## Phase 5: Provider Features - Order Management
- [x] Create order list screen (incoming orders)
- [x] Implement order detail view (buyer info, items, address)
- [x] Implement order status update (confirm, ready, delivered)
- [x] Add order notifications
- [x] Implement order history view
- [x] Add order filtering (pending, confirmed, delivered)

## Phase 6: Provider Features - Settings & Dashboard
- [x] Create provider dashboard with stats
- [x] Implement provider settings screen
- [x] Add notification preferences (always-on after permission grant; granular toggles deferred)
- [x] Implement profile editing

## Phase 7: Buyer Features - Browse & Search
- [x] Create home screen with featured suppliers
- [x] Implement supplier search functionality
- [x] Create supplier list view with filters
- [x] Implement supplier detail screen
- [x] Add category filtering
- [x] Implement supplier ratings/reviews display (rating only; reviews not modeled)

## Phase 8: Buyer Features - Product Browsing & Cart
- [x] Create product grid view (supplier's products)
- [x] Implement product detail screen
- [x] Implement add to cart functionality
- [x] Create shopping cart screen
- [x] Implement quantity adjustment in cart
- [x] Implement remove item from cart
- [x] Add cart persistence (server-side via tRPC, not AsyncStorage)

## Phase 9: Buyer Features - Checkout & Orders
- [x] Create checkout screen (address confirmation)
- [x] Implement order placement
- [x] Create order confirmation screen
- [x] Implement order history screen
- [x] Create order detail view (buyer side)
- [x] Implement reorder functionality
- [x] Add order status tracking

## Phase 10: Buyer Features - Settings & Profile
- [x] Create buyer settings screen
- [x] Implement profile editing
- [x] Add saved addresses management (requires `pnpm db:push` to apply migration)
- [x] Implement notification preferences (always-on after permission grant)

## Phase 11: Advanced Backend Features
- [x] Set up database schema (users, products, orders, etc.)
- [x] Implement API endpoints for authentication
- [x] Implement API endpoints for product management
- [x] Implement API endpoints for order management
- [x] Implement file upload for product images
- [x] Set up push notifications
- [x] Implement real-time order status updates (polling via react-query refetchInterval; push covers background)

## Phase 12: UI/UX Polish
- [x] Implement loading states and spinners
- [x] Add error handling and user feedback
- [x] Implement haptic feedback on interactions
- [x] Add smooth transitions and animations
- [x] Optimize images and performance (expo-image transitions, memory-disk cache)
- [x] Test responsive design on various screen sizes (web 720px cap added; manual QA still recommended)
- [x] Implement dark mode support

## Phase 13: Testing & Deployment
- [x] Write unit tests for key features (tests/routers.test.ts covers checkout, status update, reorder, addresses, push registration; tests/auth.logout.test.ts unskipped)
- [ ] Test end-to-end user flows (provider and buyer) — manual QA
- [ ] Test on iOS and Android devices — manual QA
- [x] Fix bugs and edge cases (pushTokens.unregister ownership leak fixed, cart auto-prefill timing, auth-screen redirect guard)
- [x] Performance optimization (terminal-state polling stop, expo-image transitions, layout animations, memoized stats)
- [x] Create checkpoint and prepare for deployment (DEPLOY.md added)
