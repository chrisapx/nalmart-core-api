# Week 2, Day 1-3 Complete - Database Models & Authentication

**Date**: February 12, 2026
**Status**: ✅ All Database Models & Authentication Infrastructure Complete

## Summary

Successfully implemented all core database models with UUID primary keys and complete authentication infrastructure with JWT tokens, Redis token blacklisting, and comprehensive auth endpoints.

## Completed Tasks

### Day 1-2: Database Models ✅

**All models created with UUID (CHAR(36)) primary keys:**

1. ✅ **User Model** (`src/models/User.ts`)
   - UUID primary key
   - Password hashing with bcrypt (BeforeCreate & BeforeUpdate hooks)
   - Email validation
   - Status enum: active, inactive, suspended, deleted
   - Email verification fields
   - Last login tracking
   - Soft deletes (paranoid)
   - Instance method: `comparePassword()`
   - Virtual property: `fullName`
   - Auto-exclude password from JSON

2. ✅ **Role Model** (`src/models/Role.ts`)
   - UUID primary key
   - Unique name and slug
   - Is_active flag
   - Sort order for display
   - Belongs to many Users through UserRole
   - Belongs to many Permissions through RolePermission

3. ✅ **Permission Model** (`src/models/Permission.ts`)
   - UUID primary key
   - Unique name and slug (e.g., `CREATE_PRODUCT`, `VIEW_ORDER`)
   - Category grouping
   - Is_active flag
   - Belongs to many Roles through RolePermission

4. ✅ **UserRole Model** (`src/models/UserRole.ts`)
   - UUID primary key
   - Junction table for User-Role many-to-many
   - Tracks who assigned the role (`assigned_by`)
   - Composite unique constraint on user_id + role_id
   - Cascade delete

5. ✅ **RolePermission Model** (`src/models/RolePermission.ts`)
   - UUID primary key
   - Junction table for Role-Permission many-to-many
   - Tracks who assigned the permission (`assigned_by`)
   - Composite unique constraint on role_id + permission_id
   - Cascade delete

6. ✅ **Category Model** (`src/models/Category.ts`)
   - UUID primary key
   - Supports nested categories (`parent_id`)
   - Image URL storage (S3)
   - Is_active flag
   - Sort order
   - Soft deletes

7. ✅ **Product Model** (`src/models/Product.ts`)
   - UUID primary key
   - Complete product fields: name, slug, SKU, price, compare_at_price, cost_price
   - Stock management: stock_quantity, low_stock_threshold, stock_status enum
   - Product flags: is_active, is_featured
   - Rating and review tracking
   - View count and sales count
   - Weight and dimensions (JSON)
   - Metadata (JSON) for flexibility
   - Foreign key to Category
   - Soft deletes

8. ✅ **ProductImage Model** (`src/models/ProductImage.ts`)
   - UUID primary key
   - **URL-only storage** (S3 URLs, no local file storage)
   - Image metadata: name, alt_text, size, mime_type, width, height
   - Is_primary flag
   - Sort order for gallery
   - Foreign key to Product
   - Cascade delete when product deleted

9. ✅ **Order Model** (`src/models/Order.ts`)
   - UUID primary key
   - Human-readable order_number (unique)
   - Status enum: pending, processing, confirmed, shipped, delivered, cancelled, refunded, failed
   - Payment_status enum: pending, paid, failed, refunded, partially_refunded
   - Fulfillment_status enum: pending, processing, shipped, delivered, cancelled
   - Financial fields: subtotal, tax_amount, shipping_amount, discount_amount, total_amount
   - Currency support
   - Coupon tracking
   - Payment method and transaction ID
   - Shipping & billing addresses (JSON)
   - Tracking number and carrier
   - Timestamp fields: shipped_at, delivered_at, cancelled_at
   - Customer and admin notes
   - IP address and user agent tracking
   - Foreign key to User
   - Soft deletes

10. ✅ **OrderItem Model** (`src/models/OrderItem.ts`)
    - UUID primary key
    - **Product snapshot at time of order**: product_name, product_sku, product_image_url
    - Quantity and pricing: unit_price, total_price, discount_amount
    - Metadata (JSON) for variants, options, etc.
    - Foreign keys to Order and Product
    - Cascade delete when order deleted

**Database Sync Status:**
- All tables created successfully in `nalmart_dev` database
- Foreign key constraints established
- Indexes created automatically by Sequelize

### Day 3: Authentication Infrastructure ✅

1. ✅ **TypeScript Types** (`src/types/`)
   - `express.d.ts`: JWTPayload, AuthRequest interface
   - `auth.types.ts`: LoginRequest, RegisterRequest, AuthResponse, RefreshTokenRequest, TokenPair

2. ✅ **JWT Utilities** (`src/utils/jwt.ts`)
   - `generateAccessToken()`: Creates access token with configurable expiry
   - `generateRefreshToken()`: Creates refresh token with longer expiry
   - `generateTokenPair()`: Generates both tokens at once
   - `verifyAccessToken()`: Verifies and decodes access token
   - `verifyRefreshToken()`: Verifies and decodes refresh token
   - `decodeToken()`: Decodes without verification
   - `getTokenExpiry()`: Extracts expiry time
   - `isTokenExpired()`: Checks if token is expired

3. ✅ **Authentication Middleware** (`src/middleware/auth.ts`)
   - `authenticate()`: Protects routes, validates JWT, checks token blacklist, loads user
   - `optionalAuth()`: Attaches user if token present, silently fails otherwise
   - Verifies user is active
   - Attaches user, userId, and token to request object

4. ✅ **Auth Controller** (`src/controllers/auth.controller.ts`)
   - `register()`: User registration with validation
     - Email format validation
     - Password strength validation (min 8 chars)
     - Duplicate email check
     - Auto-hash password via model hook
     - Returns user + tokens
   - `login()`: User authentication
     - Credential validation
     - Account status check
     - Password comparison
     - Last login tracking (IP + timestamp)
     - Returns user + tokens
   - `logout()`: Secure logout
     - Blacklists access token in Redis
     - TTL matches token expiry
   - `refreshToken()`: Token refresh
     - Validates refresh token
     - Checks blacklist
     - Generates new token pair
     - Blacklists old refresh token
   - `getProfile()`: Get authenticated user profile

5. ✅ **Auth Routes** (`src/routes/auth.routes.ts`)
   - `POST /api/v1/auth/register` - User registration
   - `POST /api/v1/auth/login` - User login
   - `POST /api/v1/auth/logout` - User logout (protected)
   - `POST /api/v1/auth/refresh-token` - Refresh access token
   - `GET /api/v1/auth/profile` - Get user profile (protected)

6. ✅ **Redis Token Blacklisting**
   - Tokens blacklisted on logout with TTL
   - Refresh tokens blacklisted when refreshed
   - Auth middleware checks blacklist on every request
   - Helper functions in `src/config/redis.ts`:
     - `blacklistToken(token, expiresIn)`
     - `isTokenBlacklisted(token)`

## API Endpoints Available

### Public Endpoints
```bash
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
```

### Protected Endpoints (requires Bearer token)
```bash
POST /api/v1/auth/logout
GET /api/v1/auth/profile
```

### Health Check
```bash
GET /health
```

## Environment Variables Used

```env
# JWT Configuration
JWT_SECRET=nalmart_dev_secret_key_change_in_production
JWT_REFRESH_SECRET=nalmart_dev_refresh_secret_key_change_in_production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nalmart_dev
DB_USER=root
DB_PASSWORD=mysql

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Database Schema Summary

| Table | Primary Key | Special Features |
|-------|-------------|------------------|
| users | UUID | Password hashing, soft deletes, email unique |
| roles | UUID | Unique slug |
| permissions | UUID | Unique slug, category grouping |
| user_roles | UUID | Junction, composite unique |
| role_permissions | UUID | Junction, composite unique |
| categories | UUID | Nested (parent_id), soft deletes |
| products | UUID | Stock mgmt, ratings, soft deletes |
| product_images | UUID | URL-only (S3), is_primary flag |
| orders | UUID | Status enums, JSON addresses, soft deletes |
| order_items | UUID | Product snapshot, metadata |

## Security Features Implemented

1. **Password Security**
   - Bcrypt hashing with salt (10 rounds)
   - Auto-hash on create and update
   - Never expose password in JSON responses

2. **JWT Security**
   - Separate secrets for access & refresh tokens
   - Configurable expiry times
   - Token verification on every protected request
   - Proper error handling (expired, invalid, malformed)

3. **Token Blacklisting**
   - Redis-based blacklist
   - Automatic TTL (matches token expiry)
   - Checked on every auth middleware call
   - Prevents reuse of logged-out/refreshed tokens

4. **Input Validation**
   - Email format validation
   - Password strength requirements
   - Required field validation
   - SQL injection prevention (Sequelize ORM)

5. **Account Security**
   - Active status check on login
   - Last login IP tracking
   - Last login timestamp

## Testing Instructions

### 1. Test User Registration
```bash
curl -X POST http://localhost:1337/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "securepassword123",
    "phone": "+1234567890"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      ...
    },
    "tokens": {
      "access_token": "jwt-token-here",
      "refresh_token": "jwt-refresh-token-here",
      "expires_in": "1h"
    }
  },
  "statusCode": 201
}
```

### 2. Test User Login
```bash
curl -X POST http://localhost:1337/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### 3. Test Get Profile (Protected)
```bash
curl -X GET http://localhost:1337/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 4. Test Logout
```bash
curl -X POST http://localhost:1337/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 5. Test Token Refresh
```bash
curl -X POST http://localhost:1337/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

## Server Status

✅ **Server Running**: http://localhost:1337
✅ **API Base**: http://localhost:1337/api/v1
✅ **Database**: Connected to `nalmart_dev`
✅ **Redis**: Connected and operational
✅ **Models**: All 10 models synchronized

## Files Created

### Models (10 files)
- `src/models/User.ts`
- `src/models/Role.ts`
- `src/models/Permission.ts`
- `src/models/UserRole.ts`
- `src/models/RolePermission.ts`
- `src/models/Category.ts`
- `src/models/Product.ts`
- `src/models/ProductImage.ts`
- `src/models/Order.ts`
- `src/models/OrderItem.ts`

### Authentication (7 files)
- `src/types/express.d.ts`
- `src/types/auth.types.ts`
- `src/utils/jwt.ts`
- `src/middleware/auth.ts`
- `src/controllers/auth.controller.ts`
- `src/routes/auth.routes.ts`
- `src/app.ts` (updated)

## Next Steps - Week 2, Day 4-5

### Day 4: RBAC Middleware
- [ ] Create Permission Service with helper methods
  - `hasPermission(user, permission)`
  - `hasAnyPermission(user, permissions[])`
  - `hasAllPermissions(user, permissions[])`
  - `canAccessResource(user, resource, action)`
  - `isSuperAdmin(user)` - Check for `ALL_FUNCTIONS`
  - `isAdmin(user)`
- [ ] Create `authorize(permission)` middleware
- [ ] Implement special permissions:
  - `ALL_FUNCTIONS` - Full access
  - `ALL_FUNCTIONS_READ` - Read-only access
  - `ALL_FUNCTIONS_WRITE` - Create/Update/Delete access
- [ ] Create permission seeding script (100+ permissions)
- [ ] Create role seeding script (7 default roles)

### Day 5: AWS S3 Setup
- [ ] Configure S3 client (`src/config/aws.ts`)
- [ ] Create upload service (`src/services/upload.service.ts`)
- [ ] Implement image upload endpoint
- [ ] Test S3 integration
- [ ] Handle multiple file uploads
- [ ] Generate thumbnails (optional)

## Key Achievements

1. ✅ All models use UUID primary keys as requested
2. ✅ ProductImage uses URL-only storage (no local files)
3. ✅ Complete authentication flow with JWT
4. ✅ Redis token blacklisting for security
5. ✅ Password hashing with bcrypt
6. ✅ Comprehensive error handling
7. ✅ TypeScript strict mode compliance
8. ✅ Proper model associations and cascade deletes
9. ✅ Soft deletes on User, Category, Product, Order
10. ✅ Product snapshot in OrderItems (prevents data loss)

## Notes

- All primary keys are UUID (CHAR(36)) as requested
- ProductImage stores only URLs, no file data in database
- Order items snapshot product data to prevent historical data loss
- JWT tokens use environment variables for secrets and expiry
- Redis blacklist ensures logged-out tokens can't be reused
- Password never exposed in API responses
- Server running successfully on port 1337

Ready to proceed with RBAC middleware and permission system! 🚀
