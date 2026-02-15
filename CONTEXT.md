# Nalmart E-Commerce System - Full Codebase Context

**Project Start Date**: Week 1, February 2026  
**Current Date**: February 14, 2026  
**Status**: Active Development (Week 2+ Complete)

---

## 🏗️ System Architecture Overview

Nalmart is an AliXpress-inspired e-commerce platform built with a microservices-ready architecture. The system consists of three main components:

```
Nalmart E-Commerce Ecosystem
├── 📡 nalmart-core-api (Backend)
├── 🎛️ nalmart-admin-hub (Admin UI)
└── 🛍️ ui (Customer/Client UI)
```

---

## 📡 1. NALMART CORE API

**Location**: `/Users/chris/Desktop/5-11/nmt/nalmart-core-api`  
**Language**: TypeScript (Node.js 20+)  
**Framework**: Express.js  
**Type**: RESTful API Backend  
**Package**: `nalmart-core-api@1.0.0`

### 1.1 Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | Node.js | 20+ |
| Framework | Express.js | 5.2.1 |
| Language | TypeScript | 5.9.3 |
| ORM | Sequelize + sequelize-typescript | 6.37.7 / 2.1.6 |
| Database | MySQL 8.0 | via mysql2 3.17.0 |
| Caching | Redis | ioredis 5.9.3 |
| Authentication | JWT + bcrypt | 9.0.3 / 6.0.0 |
| File Storage | AWS S3 | SDK 3.988.0 |
| Security | Helmet | 8.1.0 |
| Rate Limiting | express-rate-limit | 8.2.1 |
| Logging | Winston | 3.19.0 |
| Validation | Joi | 18.0.2 |
| Testing | Jest + Supertest | 30.2.0 / 7.2.2 |
| Linting | ESLint + Prettier | 9.39.2 / 3.8.1 |

### 1.2 Project Structure

```
src/
├── config/              # Configuration files
│   ├── aws.ts          # AWS S3 configuration & utilities
│   ├── database.ts     # MySQL/Sequelize connection
│   ├── env.ts          # Environment variable management
│   ├── multer.ts       # File upload configuration
│   ├── redis.ts        # Redis connection
│   └── sequelize.config.js # Sequelize CLI config
│
├── controllers/        # Request handlers
│   ├── auth.controller.ts
│   ├── category.controller.ts
│   ├── product.controller.ts
│   └── upload.controller.ts
│
├── models/            # Database models (Sequelize TypeScript)
│   ├── User.ts
│   ├── Role.ts
│   ├── Permission.ts
│   ├── UserRole.ts
│   ├── RolePermission.ts
│   ├── Product.ts
│   ├── Category.ts
│   ├── ProductImage.ts
│   ├── ProductVideo.ts
│   ├── Order.ts
│   └── OrderItem.ts
│
├── routes/            # API route definitions
│   ├── auth.routes.ts
│   ├── category.routes.ts
│   ├── product.routes.ts
│   └── upload.routes.ts
│
├── middleware/        # Custom middleware
│   ├── auth.ts        # JWT authentication
│   ├── rbac.ts        # Role-Based Access Control
│   ├── validation.ts  # Request validation
│   └── errorHandler.ts
│
├── services/          # Business logic layer
│   ├── category.service.ts
│   ├── product.service.ts
│   ├── upload.service.ts
│   └── permission.service.ts
│
├── types/             # TypeScript type definitions
│   ├── auth.types.ts
│   └── express.d.ts
│
├── validators/        # Request validation schemas (Joi)
│   ├── category.validator.ts
│   └── product.validator.ts
│
├── utils/             # Utility functions
│   ├── errors.ts      # Custom error classes
│   ├── jwt.ts         # JWT utilities
│   ├── logger.ts      # Winston logger
│   └── response.ts    # Standard response formatting
│
├── seeds/             # Database seeders
│   ├── index.ts
│   ├── permissions.seed.ts
│   └── roles.seed.ts
│
├── migrations/        # SQL migrations (manual)
│   ├── 001_add_product_fields.sql
│   └── 002_add_missing_product_fields.sql
│
└── app.ts            # Application entry point
```

### 1.3 Database Models

#### User Model
```typescript
- id (BIGINT, PK)
- first_name (STRING)
- last_name (STRING)
- email (STRING, UNIQUE)
- password (STRING, hashed)
- phone (STRING)
- avatar_url (STRING)
- is_active (BOOLEAN)
- email_verified_at (DATETIME)
- last_login_at (DATETIME)
- Relationships: HasMany Roles, HasMany Orders
- Timestamps: created_at, updated_at, deleted_at (paranoid: true)
```

#### Role Model
```typescript
- id (BIGINT, PK)
- name (STRING, UNIQUE)
- description (TEXT)
- Relationships: BelongsToMany Users, HasMany RolePermissions
```

#### Permission Model
```typescript
- id (BIGINT, PK)
- name (STRING, UNIQUE)
- description (TEXT)
- Relationships: HasMany RolePermissions
```

#### RolePermission Model
```typescript
- Composite FK: role_id, permission_id
- Relationships: BelongsTo Role, BelongsTo Permission
```

#### UserRole Model
```typescript
- Composite FK: user_id, role_id
- Relationships: BelongsTo User, BelongsTo Role
```

#### Product Model
```typescript
- id (BIGINT, PK)
- name (STRING)
- slug (STRING, UNIQUE)
- description (TEXT LONG)
- short_description (STRING)
- price (DECIMAL)
- discount_percentage (DECIMAL)
- discounted_price (DECIMAL, computed)
- sku (STRING, UNIQUE)
- stock_quantity (INT)
- category_id (FK)
- min_order_quantity (INT)
- weight (DECIMAL)
- dimensions (JSON)
- seo_title (STRING)
- seo_description (STRING)
- seo_keywords (STRING)
- status (ENUM: draft, published, archived)
- is_featured (BOOLEAN)
- rating (DECIMAL)
- review_count (INT)
- Relationships: BelongsTo Category, HasMany ProductImage, HasMany ProductVideo, HasMany OrderItem
- Timestamps: created_at, updated_at, deleted_at (paranoid: true)
```

#### Category Model
```typescript
- id (BIGINT, PK)
- name (STRING)
- slug (STRING, UNIQUE)
- description (TEXT)
- image_url (STRING)
- parent_category_id (FK, self-referential)
- is_active (BOOLEAN)
- display_order (INT)
- Relationships: HasMany Products, BelongsTo Category (parent), HasMany Category (children)
- Timestamps: created_at, updated_at, deleted_at (paranoid: true)
```

#### ProductImage Model
```typescript
- id (BIGINT, PK)
- product_id (FK)
- image_url (STRING)
- alt_text (STRING)
- image_type (ENUM: thumbnail, gallery, banner)
- display_order (INT)
- Relationships: BelongsTo Product
- Timestamps: created_at, updated_at, deleted_at
```

#### ProductVideo Model
```typescript
- id (BIGINT, PK)
- product_id (FK)
- video_url (STRING)
- title (STRING)
- Relationships: BelongsTo Product
- Timestamps: created_at, updated_at, deleted_at
```

#### Order Model
```typescript
- id (BIGINT, PK)
- order_number (STRING, UNIQUE)
- user_id (FK)
- total_amount (DECIMAL)
- tax_amount (DECIMAL)
- shipping_cost (DECIMAL)
- discount_amount (DECIMAL)
- subtotal (DECIMAL)
- status (ENUM: pending, confirmed, processing, shipped, delivered, cancelled)
- payment_status (ENUM: unpaid, paid, failed)
- shipping_address (JSON)
- billing_address (JSON)
- notes (TEXT)
- Relationships: BelongsTo User, HasMany OrderItem
- Timestamps: created_at, updated_at, deleted_at (paranoid: true)
```

#### OrderItem Model
```typescript
- id (BIGINT, PK)
- order_id (FK)
- product_id (FK)
- quantity (INT)
- unit_price (DECIMAL)
- total_price (DECIMAL, computed)
- Relationships: BelongsTo Order, BelongsTo Product
- Timestamps: created_at, updated_at
```

#### Warehouse Model (NEW)
```typescript
- id (BIGINT, PK)
- name (STRING, UNIQUE)
- code (STRING, UNIQUE) - Warehouse identifier (WH-001, etc.)
- address, city, state, postal_code, country (Location info)
- phone, email (Contact info)
- latitude, longitude (Geolocation)
- warehouse_type (ENUM: primary, secondary, regional, distribution)
- max_capacity (BIGINT) - Maximum units capacity
- is_active (BOOLEAN)
- metadata (JSON) - Additional info (hours, manager, etc.)
- Relationships: HasMany Inventory, HasMany InventoryHistory
- Timestamps: created_at, updated_at, deleted_at (paranoid: true)
```

#### Inventory Model (NEW)
```typescript
- id (BIGINT, PK)
- product_id (FK)
- warehouse_id (FK)
- quantity_on_hand (BIGINT) - Current stock
- quantity_reserved (BIGINT) - Reserved for pending orders
- quantity_available (BIGINT) - Available = on_hand - reserved
- quantity_in_transit (BIGINT) - Stock in transit
- quantity_defective (BIGINT) - Damaged/destroyed stock
- reorder_level (BIGINT) - Minimum stock threshold
- reorder_quantity (BIGINT) - Suggested order quantity
- stock_status (ENUM: in_stock, low_stock, out_of_stock, discontinued)
- cost_per_unit (DECIMAL)
- last_counted_at (DATETIME) - Last inventory verification
- last_alert_at (DATETIME) - Last alert sent
- location (JSON) - Warehouse location details (aisle, shelf, bin)
- notes (TEXT)
- Relationships: BelongsTo Product, BelongsTo Warehouse, HasMany InventoryBatch, HasMany InventoryHistory, HasMany InventoryAlert, HasMany ReservedInventory
- Timestamps: created_at, updated_at
```

#### InventoryBatch Model (NEW)
```typescript
- id (BIGINT, PK)
- inventory_id (FK)
- batch_number (STRING, UNIQUE) - Lot/batch identifier
- quantity_received (BIGINT)
- quantity_sold (BIGINT)
- quantity_damaged (BIGINT)
- quantity_remaining (BIGINT) - Computed
- cost_per_unit (DECIMAL)
- total_cost (DECIMAL)
- received_date (DATE)
- manufacture_date (DATE) - Production date
- expiry_date (DATE) - Use-by/expiry date
- status (ENUM: active, expired, recall, archived)
- supplier (STRING)
- reference_number (STRING) - PO or reference
- metadata (JSON) - Certification, test results, etc.
- notes (TEXT)
- Relationships: BelongsTo Inventory, HasMany InventoryHistory
- Timestamps: created_at, updated_at
- Helper methods: isExpired(), getDaysToExpiry()
```

#### InventoryHistory Model (NEW)
```typescript
- id (BIGINT, PK)
- inventory_id (FK)
- batch_id (FK, nullable)
- warehouse_id (FK)
- order_id (FK, nullable)
- user_id (FK, nullable) - Who made the change
- transaction_type (ENUM: stock_in, stock_out, adjustment, transfer, return, damage, expiry, recount, reserve, unreserve, system_adjustment, initial)
- quantity_change (BIGINT) - Positive or negative
- quantity_before (BIGINT)
- quantity_after (BIGINT)
- unit_cost (DECIMAL)
- reference (STRING) - PO, RMA, etc.
- status (ENUM: pending, completed, rejected, cancelled)
- reason (TEXT)
- metadata (JSON)
- Relationships: BelongsTo Inventory, BelongsTo InventoryBatch, BelongsTo Warehouse, BelongsTo Order, BelongsTo User
- Timestamps: created_at (no update)
```

#### InventoryAlert Model (NEW)
```typescript
- id (BIGINT, PK)
- inventory_id (FK)
- acknowledged_by (FK, nullable) - User who acknowledged
- alert_type (ENUM: low_stock, out_of_stock, overstock, expiring, expired, damaged)
- current_quantity (BIGINT)
- threshold (BIGINT) - What triggered alert
- status (ENUM: pending, acknowledged, resolved, ignored)
- notification_count (INT)
- triggered_at (DATETIME)
- acknowledged_at (DATETIME)
- resolution_action (TEXT)
- metadata (JSON)
- Relationships: BelongsTo Inventory, BelongsTo User
- Timestamps: created_at, updated_at
```

#### ReservedInventory Model (NEW)
```typescript
- id (BIGINT, PK)
- inventory_id (FK)
- order_id (FK)
- reserved_by (FK, nullable) - User making reservation
- quantity_reserved (BIGINT)
- status (ENUM: pending, allocated, fulfilled, released, cancelled)
- order_status (ENUM: order_pending, awaiting_payment, transit, delivered, cancelled)
- allocated_at (DATETIME) - When picked/allocated
- fulfilled_at (DATETIME) - When shipped
- expires_at (DATETIME) - Hold expiration (24 hours default)
- is_backorder (BOOLEAN)
- reserved_price (DECIMAL)
- notes (TEXT)
- Relationships: BelongsTo Inventory, BelongsTo Order, BelongsTo User
- Timestamps: created_at, updated_at
```

### 1.4 Environment Configuration

**File**: `.env` (see `.env.example`)

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nalmart_dev
DB_USER=root
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3
AWS_REGION=eu-north-1
AWS_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_ROOT_PATH=
CDN_URL=

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080

# Email (Optional - for future implementation)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@nalmart.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 1.5 API Endpoints (Current)

#### Health Check
```
GET /health
Response: { success, message, version, timestamp }
```

#### Authentication Routes (`/api/v1/auth`)
- Routes defined but endpoints not yet listed

#### Category Routes (`/api/v1/categories`)
- Category CRUD operations and management

#### Product Routes (`/api/v1/products`)
- Product CRUD, filtering, search operations

#### Upload Routes (`/api/v1/upload`)
- File upload to AWS S3
- Multiple file handling

#### Inventory Routes (`/api/v1/inventory`) - NEW ✨
**All routes require authentication + specific permissions**

Core Operations:
- `POST /initialize` - Initialize inventory (requires: create:inventory)
- `POST /stock-in` - Record incoming stock (requires: manage:inventory)
- `POST /stock-out` - Record outgoing stock (requires: manage:inventory)
- `POST /reserve` - Reserve inventory for order (requires: manage:inventory)
- `PUT /unreserve/:reservation_id` - Unreserve inventory (requires: manage:inventory)
- `PUT /adjust` - Manual inventory adjustment (requires: manage:inventory)
- `POST /damage` - Record damaged inventory (requires: manage:inventory)

Retrieval & Reporting:
- `GET /:inventoryId` - Get inventory details (requires: view:inventory)
- `GET /product/:productId` - Get product inventory all warehouses (requires: view:inventory)
- `GET /low-stock/list?warehouseId=X` - Get low stock items (requires: view:inventory)
- `GET /:inventoryId/history?limit=100&offset=0` - Get inventory history (requires: view:inventory)
- `GET /warehouse/:warehouseId/summary` - Warehouse inventory summary (requires: view:inventory)
- `GET /expiring/batches?days=30` - Get expiring batches (requires: view:inventory)

### 1.6 Middleware Stack

| Middleware | Purpose |
|-----------|---------|
| `helmet()` | Security headers |
| `cors()` | CORS handling with origin validation |
| `express.json()` | JSON body parsing |
| `express.urlencoded()` | URL-encoded body parsing |
| `rateLimit()` | Rate limiting (100 req/15min per IP) |
| `authMiddleware` | JWT authentication |
| `rbacMiddleware` | Role-Based Access Control |
| `validationMiddleware` | Request validation (Joi schemas) |
| `errorHandler` | Global error handling |
| `notFoundHandler` | 404 handling |

### 1.7 Authentication & Authorization

**JWT Strategy**:
- Access tokens: 1 hour expiry
- Refresh tokens: 7 days expiry
- Password hashing: bcrypt (salt rounds: 10)

**RBAC Implementation**:
- Roles: Admin, Manager, Seller, Customer, Guest
- Permissions: Resource-based (e.g., 'create:product', 'read:order')
- Middleware validates user roles and permissions before route execution

### 1.8 File Upload System (AWS S3)

**Supported Features**:
- Single/multiple file uploads
- Product images (thumbnail, gallery, banner)
- Category images
- User avatars
- Signed URL generation (for temporary access)
- File metadata storage
- Parallel uploads/deletes

**Upload Service Methods**:
- `uploadFile(file, folder)` - Single file
- `uploadMultipleFiles(files, folder)` - Batch upload
- `uploadProductImage(file)` - Product-specific
- `uploadCategoryImage(file)` - Category-specific
- `uploadUserAvatar(file)` - Avatar-specific
- `deleteFile(key)` - Single delete
- `deleteMultipleFiles(keys)` - Batch delete
- `getSignedUrl(key, expiresIn)` - Temporary access
- `fileExists(key)` - Existence check

**Allowed Image Types**: JPEG, PNG, GIF, WebP, SVG  
**Max Image Size**: 10MB  
**Max Document Size**: 20MB  
**Max Video Size**: 100MB

### 1.9 Available Scripts

```bash
# Development
npm run dev              # Start with nodemon (hot reload)
npm run build           # Compile TypeScript
npm start              # Run compiled app
npm run start:prod     # Production mode

# Database
npm run migrate        # Run migrations
npm run migrate:undo   # Revert last migration
npm run migrate:status # Check migration status
npm run migrate:create # Create new migration
npm run seed           # Run all seeders
npm run seed:permissions # Seed permissions only
npm run seed:roles     # Seed roles only

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format with Prettier
npm run format:check   # Check format

# Testing
npm run test           # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

### 1.10 Development Setup

1. **Install dependencies**:
   ```bash
   cd /Users/chris/Desktop/5-11/nmt/nalmart-core-api
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with correct credentials
   ```

3. **Database setup**:
   ```bash
   # Create MySQL database
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nalmart_dev;"
   
   # Run migrations
   npm run migrate
   
   # Seed initial data
   npm run seed
   ```

4. **Start development server**:
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

5. **Verify connectivity**:
   - Health check: `GET http://localhost:3000/health`
   - Redis: Tested on startup
   - MySQL: Requires valid credentials
   - AWS S3: Tested on startup

### 1.11 Development Progress

**✅ Week 1 Complete**:
- Project foundation and structure
- TypeScript, ESLint, Prettier configured
- Express server with middleware
- Database connection (Sequelize)
- Redis integration
- Winston logging system
- Error handling middleware
- Environment configuration

**✅ Week 2+ Complete**:
- Database models (User, Role, Permission, Product, Category, Order, etc.)
- Authentication system (JWT)
- RBAC middleware
- AWS S3 file upload service
- Upload controller and routes
- Category controller and routes
- Product controller and routes
- File validation and metadata handling
- Multer multipart form-data handling
- Signed URL generation for temporary file access

**✅ Phase 1 Complete - AliXpress-Grade Inventory Management** ✨ NEW
- Warehouse management (multi-warehouse support ready)
- Inventory tracking (quantity_on_hand, reserved, available, in_transit, defective)
- Batch/Lot tracking with expiry dates
- Inventory history tracking (complete audit trail)
- Low stock alerts and reorder levels
- Reserved inventory for pending orders
- Inventory adjustments and damage recording
- Comprehensive inventory service (15+ methods)
- Protected inventory routes with RBAC
- Full E2E test coverage
- AliXpress-grade stock management

**🔄 In Progress / Planned**:
- Order processing system (with inventory integration)
- Payment integration
- Email notifications
- Advanced product search/filtering
- Product reviews and ratings
- Favorites/Wishlist API enhancements
- Cart management
- Shipping integration
- Campaigns & Promotions (Flash Sales, Bulk Discounts, Bundle Deals, Seasonal)
- Advertisements (Banner Ads, Sponsored Products)
- Audit Logging (complete system tracking)
- Admin dashboard data APIs
- Analytics and reporting

---

## 🎛️ 2. NALMART ADMIN HUB

**Location**: `/Users/chris/Desktop/5-11/nmt/nalmart-admin-hub`  
**Language**: TypeScript + React  
**Framework**: React 18.3.1 + Vite  
**Build Tool**: Vite 5.4.19  
**Styling**: Tailwind CSS + shadcn-ui  
**Built with**: Lovable (AI-assisted development platform)  
**Package**: `vite_react_shadcn_ts@0.0.0`

### 2.1 Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Build Tool | Vite | 5.4.19 |
| React | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| UI Framework | shadcn-ui | Latest |
| UI Components | Radix UI | 1.x |
| Styling | Tailwind CSS | 3.4.17 |
| Forms | react-hook-form | 7.61.1 |
| Validation | Zod | 3.25.76 |
| Data Fetching | TanStack React Query | 5.83.0 |
| Routing | react-router-dom | 6.30.1 |
| Charts | Recharts | 2.15.4 |
| Notifications | Sonner | 1.7.4 |
| Icons | lucide-react | 0.462.0 |
| Theme | next-themes | 0.3.0 |
| Testing | Vitest | 3.2.4 |
| Linting | ESLint | 9.32.0 |

### 2.2 Directory Structure

```
src/
├── pages/                 # Admin pages
│   ├── Dashboard.tsx     # Main dashboard
│   ├── Products.tsx      # Product management
│   ├── Categories.tsx    # Category management
│   ├── Orders.tsx        # Order management
│   ├── Customers.tsx     # Customer management
│   ├── Index.tsx         # Home/Index page
│   └── NotFound.tsx      # 404 page
│
├── components/           # Reusable React components
│   ├── ui/              # shadcn-ui components
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── aspect-ratio.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── date-picker.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── hover-card.tsx
│   │   ├── input.tsx
│   │   ├── input-otp.tsx
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── radio-group.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toggle.tsx
│   │   ├── toggle-group.tsx
│   │   ├── toaster.tsx
│   │   ├── tooltip.tsx
│   │   └── (more UI components)
│   │
│   └── (feature components)
│
├── hooks/               # Custom React hooks
│   ├── useAuth.ts
│   └── (more custom hooks)
│
├── lib/                 # Utility functions and helpers
│   └── (utility functions)
│
├── App.tsx            # Root component
├── main.tsx           # React entry point
├── index.css          # Global styles
├── App.css            # App styles
└── vite-env.d.ts     # Vite type definitions
```

### 2.3 Current Pages

1. **Dashboard.tsx** - Admin dashboard with overview and statistics
2. **Products.tsx** - Product CRUD and management interface
3. **Categories.tsx** - Category management (implied from structure)
4. **Orders.tsx** - Order management and tracking
5. **Customers.tsx** - Customer information and management
6. **Index.tsx** - Landing/home page
7. **NotFound.tsx** - 404 error page

### 2.4 UI Component Library

Fully implemented shadcn-ui component library with 40+ components including:
- Data display (Table, Pagination, Progress, Slider)
- Forms (Input, Textarea, Select, Checkbox, Radio, Toggle)
- Dialogs (Dialog, Alert Dialog, Drawer, Sheet, Popover)
- Menus (Dropdown Menu, Navigation Menu, Context Menu)
- Navigation (Breadcrumb, Pagination)
- Feedback (Toast, Sonner notifications, Tooltips)
- And more...

### 2.5 Feature Capabilities

**Planned/Implemented Features**:
- Product management (CRUD)
- Category management
- Order management
- Customer management
- Dashboard with charts and analytics
- Form validation with Zod + react-hook-form
- Data table with TanStack React Query
- Dark/light theme support
- Responsive design

---

## 🛍️ 3. NALMART CLIENT UI

**Location**: `/Users/chris/Desktop/5-11/nmt/ui`  
**Language**: TypeScript + React  
**Framework**: React 18.3.1 + Vite  
**Build Tool**: Vite 5.4.19  
**Styling**: Tailwind CSS + shadcn-ui  
**Built with**: Lovable (AI-assisted development platform)  
**Package**: `vite_react_shadcn_ts@0.0.0`

### 3.1 Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Build Tool | Vite | 5.4.19 |
| React | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| UI Framework | shadcn-ui | Latest |
| UI Components | Radix UI | 1.x |
| Styling | Tailwind CSS | 3.4.17 |
| Forms | react-hook-form | 7.61.1 |
| Validation | Zod | 3.25.76 |
| HTTP Client | Axios | 1.13.5 |
| Data Fetching | TanStack React Query | 5.83.0 |
| Routing | react-router-dom | 6.30.1 |
| Charts | Recharts | 2.15.4 |
| Notifications | Sonner | 1.7.4 |
| Icons | lucide-react | 0.462.0 |
| Theme | next-themes | 0.3.0 |
| AWS SDK | AWS S3 SDK | 3.515.0 |
| Testing | Vitest | 3.2.4 |
| Linting | ESLint | 9.32.0 |

### 3.2 Directory Structure

```
src/
├── pages/                  # Page components (routing)
│   ├── Index.tsx          # Home page
│   ├── LoginPage.tsx      # User login
│   ├── RegisterPage.tsx   # User registration
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── ProductPage.tsx    # Single product detail
│   ├── CategoryPage.tsx   # Category products listing
│   ├── SearchPage.tsx     # Search results
│   ├── DealsPage.tsx      # Special offers/deals
│   ├── CartPage.tsx       # Shopping cart
│   ├── CheckoutPage.tsx   # Checkout process
│   ├── OrdersPage.tsx     # User's orders history
│   ├── WishlistPage.tsx   # Saved items
│   ├── ContactPage.tsx    # Contact us
│   ├── HelpPage.tsx       # Help/Support
│   ├── TermsPage.tsx      # Terms of service
│   ├── PrivacyPage.tsx    # Privacy policy
│   ├── CookiesPage.tsx    # Cookie policy
│   ├── ShippingPage.tsx   # Shipping info
│   ├── ReturnsPage.tsx    # Return policy
│   └── (more pages)
│
├── components/            # Reusable components
│   ├── ui/               # shadcn-ui components (~40+)
│   ├── home/             # Home page specific components
│   ├── products/         # Product-related components
│   ├── orders/           # Order-related components
│   └── layout/           # Layout components (header, footer, sidebar)
│
├── context/              # React Context API
│   ├── AuthContext.tsx   # Authentication state
│   ├── CartContext.tsx   # Shopping cart state
│   ├── WishlistContext.tsx # Wishlist state
│   └── CurrencyContext.tsx # Currency selection
│
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   └── (more custom hooks)
│
├── lib/                  # Utility functions
│   └── (utility functions)
│
├── services/             # API services and business logic
│   └── (API client services)
│
├── data/                 # Static data, constants
│   └── (seed data, constants)
│
├── App.tsx              # Root component with routing
├── main.tsx             # React entry point
├── index.css            # Global styles
├── App.css              # App-specific styles
└── vite-env.d.ts       # Vite type definitions
```

### 3.3 Current Pages

**Authentication Pages**:
1. **LoginPage.tsx** - User login form
2. **RegisterPage.tsx** - User registration
3. **ForgotPasswordPage.tsx** - Password recovery
4. **ResetPasswordPage.tsx** - Password reset

**Shopping Pages**:
5. **Index.tsx** - Homepage with featured products
6. **ProductPage.tsx** - Single product detail view
7. **CategoryPage.tsx** - Product listing by category
8. **SearchPage.tsx** - Search results
9. **DealsPage.tsx** - Special offers and deals
10. **CartPage.tsx** - Shopping cart review
11. **CheckoutPage.tsx** - Order checkout

**User Pages**:
12. **OrdersPage.tsx** - Order history and tracking
13. **WishlistPage.tsx** - Saved items

**Information Pages**:
14. **ContactPage.tsx** - Contact form
15. **HelpPage.tsx** - Help/FAQ
16. **TermsPage.tsx** - Terms of service
17. **PrivacyPage.tsx** - Privacy policy
18. **CookiesPage.tsx** - Cookie information
19. **ShippingPage.tsx** - Shipping information
20. **ReturnsPage.tsx** - Return policy

### 3.4 State Management

**Context Providers**:
- **AuthContext**: User authentication state, login/logout
- **CartContext**: Shopping cart items, quantities, totals
- **WishlistContext**: Saved/favorite items
- **CurrencyContext**: Currency selection and conversion

### 3.5 Feature Capabilities

**Implemented/Planned Features**:
- Product browsing and filtering
- Advanced search functionality
- Shopping cart management
- User authentication (login/register)
- Password recovery
- Order management
- Wishlist/favorites
- Product reviews and ratings
- Checkout process
- Payment integration (planned)
- Order tracking
- User profile
- Dark/light theme support
- Responsive mobile design
- AWS S3 file uploads
- Real-time notifications

---

## 🗑️ 4. DEPRECATED CODEBASE

**Location**: `/Users/chris/Desktop/5-11/nmt/api`  
**Status**: ⚠️ DISCONTINUED - DO NOT USE

This is the old API implementation that has been replaced by `nalmart-core-api`. All new development should use the nalmart-core-api.

---

## 🔄 Development Workflow

### Starting Development

```bash
# Terminal 1: Core API
cd /Users/chris/Desktop/5-11/nmt/nalmart-core-api
npm run dev

# Terminal 2: Admin Hub
cd /Users/chris/Desktop/5-11/nmt/nalmart-admin-hub
npm run dev

# Terminal 3: Client UI
cd /Users/chris/Desktop/5-11/nmt/ui
npm run dev
```

### Access Points

- **API**: `http://localhost:3000`
- **Admin UI**: `http://localhost:5173` (Vite default) or check terminal
- **Client UI**: `http://localhost:5174` (second Vite instance) or check terminal

### Database Setup

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nalmart_dev;"

# Run migrations
cd nalmart-core-api
npm run migrate

# Seed initial data
npm run seed
```

---

## 📊 System Communication

```
┌─────────────────────────────────────────┐
│         Client UI (React)               │
│    http://localhost:5173                │
│  - Product browsing                     │
│  - User authentication                  │
│  - Shopping cart                        │
│  - Order management                     │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP/REST API
                 │ (Axios + TanStack Query)
                 ▼
┌─────────────────────────────────────────┐
│    Core API (Express + TypeScript)      │
│    http://localhost:3000/api/v1         │
│  - User authentication (JWT)            │
│  - Product operations                   │
│  - Order processing                     │
│  - File uploads to S3                   │
│  - Category management                  │
├─────────────────────────────────────────┤
│         Backend Services                │
│  - MySQL Database (Sequelize)           │
│  - Redis Cache                          │
│  - AWS S3 Storage                       │
└─────────────────────────────────────────┘
        ▲
        │
        │
┌───────────────────────────────────────────┐
│    Admin Hub (React)                      │
│    http://localhost:5174                  │
│  - Product management                     │
│  - Order management                       │
│  - Customer management                    │
│  - Category management                    │
│  - Dashboard analytics                    │
└───────────────────────────────────────────┘
```

---

## 🔐 Security Features

1. **Authentication**: JWT with bcrypt password hashing
2. **Authorization**: RBAC with role-based middleware
3. **API Security**:
   - CORS with origin validation
   - Rate limiting (100 req/15min per IP)
   - Helmet for security headers
   - Request validation with Joi
4. **Data Protection**:
   - Paranoid delete (soft deletes)
   - Encrypted sensitive data
   - Signed URLs for temporary file access
5. **File Security**:
   - File type validation
   - Size limits
   - Virus scanning (planned)

---

## 📦 Dependencies Management

All dependencies are locked in `package-lock.json` files. Update process:

```bash
cd [project-directory]
npm update          # Update to latest compatible versions
npm audit          # Check for vulnerabilities
npm audit fix      # Fix automatically fixable issues
```

---

## 🚀 Deployment Considerations

### API Deployment
- Set `NODE_ENV=production`
- Configure production database credentials
- Configure production AWS S3 bucket
- Use environment-specific Redis instance
- Enable HTTPS in production
- Set up proper logging aggregation
- Configure CDN for S3 bucket (CloudFront recommended)

### Frontend Deployment
- Build: `npm run build`
- Output: `dist/` directory
- Deploy to CDN or static hosting
- Configure API endpoint for production
- Enable HTTPS

### Database
- Use managed MySQL service (AWS RDS, etc.)
- Enable automated backups
- Configure replication for high availability
- Set up monitoring and alerts

---

## 📝 Development Standards

### Code Style
- **Formatting**: Prettier (configured)
- **Linting**: ESLint with TypeScript support
- **Language**: TypeScript (strict mode)

### Naming Conventions
- Files: camelCase or PascalCase (components)
- Classes/Models: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

### Git Workflow
- Feature branches from `main`
- Commit messages: descriptive and concise
- Pull requests for code review
- Merge to main after approval

---

## 📚 Architecture Patterns

### Backend (API)
- **MVC Pattern**: Models, Controllers, Routes, Services
- **Middleware Chain**: Security → Validation → Business Logic → Response
- **Service Layer**: Separation of business logic from controllers
- **Error Handling**: Centralized error handler middleware

### Frontend
- **Component-Based**: Reusable, composable components
- **Context API**: Global state management
- **Custom Hooks**: Reusable logic
- **Pages/Routes**: Nested routing structure

---

## 🔍 Next Steps & TODOs

### Immediate (This Week)
- [ ] Complete order processing workflow
- [ ] Implement payment integration
- [ ] Admin dashboard data endpoints
- [ ] Product review/rating system

### Short Term (Next 2 Weeks)
- [ ] Email notification system
- [ ] Advanced search and filtering
- [ ] Inventory management
- [ ] Shipping integration
- [ ] User profile and settings

### Medium Term (Next Month)
- [ ] Analytics and reporting
- [ ] Promotional codes and discounts
- [ ] Product variants and options
- [ ] Bulk operations for admin
- [ ] Export/import functionality

### Long Term
- [ ] Multi-currency support
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Microservices refactor
- [ ] GraphQL API option
- [ ] AI-powered recommendations
- [ ] Vendor/seller management

---

## 📞 Development Support

### Key Contacts & Resources
- **Project Repository**: `/Users/chris/Desktop/5-11/nmt/`
- **Documentation**: WEEK_*.md files in each project
- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **Express Docs**: https://expressjs.com/
- **React Docs**: https://react.dev/
- **Sequelize Docs**: https://sequelize.org/

### Common Commands Reference

```bash
# Install & Setup
npm install
npm run dev
npm run build

# Database
npm run migrate
npm run migrate:status
npm run seed

# Code Quality
npm run lint
npm run lint:fix
npm run format
npm run test

# Production
npm run build
npm run start:prod
```

---

**Last Updated**: February 14, 2026  
**Version**: 1.0 (Complete System Overview)
