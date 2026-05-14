# Grocery Supply App - Interface Design

## Overview

Grocery Supply App is a two-sided marketplace mobile application that connects **grocery shop owners** (buyers) with **product suppliers/providers** (sellers). The app enables suppliers to manage their product catalogs with real-time stock availability and allows shop owners to browse suppliers, view products, and place orders for delivery.

---

## Screen List

### Provider (Supplier) Flows

1. **Provider Authentication**
   - Sign Up / Login screen
   - Profile setup (business name, location, contact)

2. **Provider Dashboard**
   - Overview of active products, pending orders, order history
   - Quick actions: Add product, View orders, Settings

3. **Product Management**
   - Product list (with edit/delete actions)
   - Add/Edit Product screen (name, description, price, image, category)
   - Stock Status Toggle (In Stock / Out of Stock)
   - Product Image Upload

4. **Order Management**
   - Incoming orders list (pending, confirmed, delivered)
   - Order detail view (buyer info, items, delivery address, status)
   - Order status update (confirm, mark as ready, delivered)

5. **Provider Settings**
   - Profile settings (business info, contact, location)
   - Notification preferences
   - Account management

### Shop Owner (Buyer) Flows

1. **Buyer Authentication**
   - Sign Up / Login screen
   - Profile setup (shop name, location, contact)

2. **Buyer Home**
   - Featured suppliers carousel
   - Search bar (search suppliers or products)
   - Category filters (vegetables, dairy, meat, etc.)
   - Recent orders / saved suppliers

3. **Browse Suppliers**
   - List of all suppliers with ratings/reviews
   - Supplier detail screen (products, location, contact)
   - Filter by category, availability, rating

4. **Product Browsing**
   - Supplier's product list with images, prices, stock status
   - Product detail (full description, price, availability)
   - Add to cart button (visible only if in stock)

5. **Shopping Cart**
   - Items from selected supplier(s)
   - Quantity adjustment
   - Price summary
   - Proceed to checkout

6. **Order Checkout**
   - Delivery address confirmation
   - Order summary
   - Confirm order button
   - Order confirmation screen

7. **Order History**
   - List of past orders with status (pending, delivered, cancelled)
   - Order detail view (items, total, delivery date)
   - Reorder functionality

8. **Buyer Settings**
   - Profile settings (shop info, contact, location)
   - Saved addresses
   - Notification preferences
   - Account management

---

## Primary Content and Functionality

### Provider Screens - Key Content

| Screen | Content | Functionality |
|--------|---------|----------------|
| **Product List** | Product cards (image, name, price, stock status) | Add, Edit, Delete, Toggle stock |
| **Add/Edit Product** | Form fields: name, description, price, category, image upload | Save product, Cancel |
| **Order List** | Order cards (buyer name, items count, order date, status) | View details, Update status |
| **Order Detail** | Buyer info, items list, delivery address, order status, timeline | Confirm order, Mark ready, Mark delivered |
| **Dashboard** | Stats: active products, pending orders, revenue | Quick links to key actions |

### Buyer Screens - Key Content

| Screen | Content | Functionality |
|--------|---------|----------------|
| **Home** | Supplier carousel, search bar, categories, recent orders | Navigate to supplier, search, filter |
| **Supplier List** | Supplier cards (name, rating, location, product count) | Tap to view supplier details |
| **Supplier Detail** | Supplier info, product grid, filters | Browse products, add to cart |
| **Product Grid** | Product cards (image, name, price, stock badge) | Tap for details, add to cart (if in stock) |
| **Product Detail** | Full image, name, description, price, stock status, reviews | Add to cart, Share |
| **Cart** | Item list with quantities, price per item, total | Adjust quantity, Remove item, Checkout |
| **Checkout** | Delivery address, order summary, confirm button | Place order |
| **Order History** | Order cards (date, supplier, total, status) | Tap for details, Reorder |

---

## Key User Flows

### Flow 1: Provider - Add and Manage Products

1. Provider logs in → Dashboard
2. Tap "Add Product" → Product form screen
3. Fill in product details (name, price, category, description)
4. Upload product image (camera or gallery)
5. Set initial stock status (In Stock / Out of Stock)
6. Tap "Save" → Product appears in product list
7. Provider can edit or delete product from list
8. Provider can toggle stock status with a single tap

### Flow 2: Buyer - Browse and Order

1. Buyer logs in → Home screen
2. Browse featured suppliers OR use search bar to find supplier
3. Tap supplier card → Supplier detail screen
4. Browse supplier's products (with images, prices, stock status)
5. Tap product → Product detail screen
6. If in stock: Tap "Add to Cart" → Item added, quantity selector appears
7. Continue shopping or tap "Cart" icon
8. Review cart items and quantities
9. Tap "Checkout" → Delivery address confirmation
10. Tap "Place Order" → Order confirmation screen
11. Order sent to supplier with status "Pending"

### Flow 3: Provider - Receive and Fulfill Order

1. Provider receives notification of new order
2. Tap notification → Order detail screen
3. Review buyer info, items, delivery address
4. Tap "Confirm Order" → Status changes to "Confirmed"
5. Prepare items for delivery
6. Tap "Mark as Ready" → Status changes to "Ready for Delivery"
7. Tap "Mark Delivered" → Status changes to "Delivered"
8. Order moves to completed list

### Flow 4: Buyer - Track Order

1. Buyer navigates to "Order History"
2. Taps recent order → Order detail screen
3. Sees order status (Pending → Confirmed → Ready → Delivered)
4. Can contact supplier if needed
5. After delivery, can rate supplier/products

---

## Color Choices

The app uses a fresh, professional color scheme suitable for a B2B grocery marketplace:

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Primary** | Fresh Green | #10B981 | Buttons, active states, success indicators |
| **Secondary** | Warm Orange | #F97316 | Accents, highlights, special offers |
| **Background** | Clean White | #FFFFFF | Main background (light mode) |
| **Surface** | Light Gray | #F3F4F6 | Cards, elevated surfaces |
| **Text Primary** | Dark Gray | #1F2937 | Main text, headings |
| **Text Secondary** | Medium Gray | #6B7280 | Subtitles, descriptions |
| **Border** | Light Gray | #E5E7EB | Dividers, borders |
| **Success** | Green | #10B981 | Order confirmed, in stock |
| **Warning** | Amber | #F59E0B | Stock running low, pending actions |
| **Error** | Red | #EF4444 | Out of stock, order cancelled |
| **Dark Background** | Dark Gray | #111827 | Dark mode background |

---

## Mobile Portrait Orientation (9:16) & One-Handed Usage

All screens are designed for **portrait orientation** with **one-handed usage** in mind:

- **Tab bar** positioned at bottom for easy thumb access
- **Primary actions** (buttons, CTAs) placed in lower half of screen
- **Search and filters** at top with large touch targets
- **Product images** optimized for quick scanning
- **Minimal horizontal scrolling** — vertical scroll is primary
- **Touch targets** minimum 44pt × 44pt (iOS HIG standard)
- **Spacing** between interactive elements to prevent accidental taps

---

## iOS Human Interface Guidelines Alignment

The app follows **Apple Human Interface Guidelines** to feel like a first-party iOS app:

- **Navigation**: Tab bar for primary navigation (Provider vs. Buyer modes)
- **Feedback**: Haptic feedback on button taps, loading states with spinners
- **Typography**: System fonts (SF Pro Display) with clear hierarchy
- **Spacing**: Consistent 16pt padding, 8pt component spacing
- **Icons**: SF Symbols for consistency with iOS ecosystem
- **Modals**: Bottom sheets for secondary actions, full-screen for complex flows
- **Transitions**: Smooth, purposeful animations (no excessive motion)
- **Accessibility**: High contrast, readable text sizes, VoiceOver support

---

## Technical Considerations

- **Authentication**: Two separate user roles (Provider and Buyer) with distinct login flows
- **Image Handling**: Product images uploaded to server storage (S3 or similar)
- **Real-time Updates**: Order status changes notify both provider and buyer
- **Offline Support**: Basic browsing cached locally; orders require connectivity
- **Push Notifications**: Alerts for new orders (provider), order status updates (buyer)

