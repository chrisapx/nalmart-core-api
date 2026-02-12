# Week 2, Day 5 Complete - AWS S3 Integration

**Date**: February 12, 2026
**Status**: ✅ Complete AWS S3 Image Upload System

## Summary

Successfully implemented a comprehensive AWS S3 integration with file upload service, multer configuration, upload controller, and RBAC-protected routes. The system supports single/multiple file uploads, product images, category images, user avatars, and file management operations.

## Completed Tasks

### ✅ AWS S3 Configuration (`src/config/aws.ts`)

Created S3 client configuration with:

- **S3Client** initialization with credentials and region
- **testS3Connection()** - Validates AWS credentials and bucket configuration
- **getBucketName()** - Returns configured S3 bucket name
- **getRootPath()** - Returns S3 root path for file organization
- **getCDNUrl()** - Returns CDN URL if configured (CloudFront support)
- **buildS3Key()** - Builds full S3 key with root path
- **buildPublicUrl()** - Builds public URL for S3 objects (S3 or CDN)

Environment variables used:
```env
AWS_REGION=us-east-1
AWS_BUCKET=sandbox-neob-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_ROOT_PATH=
CDN_URL=
```

### ✅ Upload Service (`src/services/upload.service.ts`)

Comprehensive upload service with 15+ methods:

#### Core Upload Methods
1. **`uploadFile(file, folder)`** - Upload single file to S3
2. **`uploadMultipleFiles(files, folder)`** - Upload multiple files in parallel
3. **`uploadProductImage(file)`** - Upload to `products/` folder
4. **`uploadCategoryImage(file)`** - Upload to `categories/` folder
5. **`uploadUserAvatar(file)`** - Upload to `avatars/` folder

#### File Management Methods
6. **`deleteFile(key)`** - Delete single file from S3
7. **`deleteMultipleFiles(keys)`** - Delete multiple files in parallel
8. **`copyFile(sourceKey, destinationKey)`** - Copy file within S3
9. **`fileExists(key)`** - Check if file exists in S3
10. **`getFileMetadata(key)`** - Get file metadata from S3

#### Signed URL Methods
11. **`getSignedUrl(key, expiresIn)`** - Generate temporary signed URL (default 1 hour)

#### Helper Methods
12. **`extractKeyFromUrl(url)`** - Extract S3 key from URL
13. **`isValidImageType(mimeType)`** - Validate image MIME type
14. **`isValidFileSize(size, maxSizeMB)`** - Validate file size
15. **`validateImageFile(file, maxSizeMB)`** - Complete image validation

Features:
- **Unique filenames** using UUID v4
- **Public ACL** for uploaded files
- **Metadata storage** (original filename, upload timestamp)
- **Parallel uploads/deletes** using Promise.all
- **Comprehensive error handling** with detailed logging
- **Allowed image types**: JPEG, PNG, GIF, WebP, SVG
- **Max file size**: 10MB for images (configurable)

### ✅ Multer Configuration (`src/config/multer.ts`)

Multer middleware for multipart/form-data handling:

#### File Size Limits
```typescript
IMAGE: 10MB
DOCUMENT: 20MB
VIDEO: 100MB
```

#### Upload Configurations
1. **`uploadSingleImage`** - Single image (field: 'image')
2. **`uploadMultipleImages`** - Multiple images (field: 'images', max 10)
3. **`uploadProductImages`** - Product images (field: 'images', max 10)
4. **`uploadSingleDocument`** - Single document (field: 'document')
5. **`uploadMultipleDocuments`** - Multiple documents (field: 'documents', max 5)
6. **`uploadSingleVideo`** - Single video (field: 'video')
7. **`uploadMixedFields`** - Mixed fields (avatar, images, documents)
8. **`uploadAnyFile`** - Any file type

#### File Filters
- **Image filter**: JPEG, PNG, GIF, WebP, SVG
- **Document filter**: PDF, Word, Excel
- **Video filter**: MP4, MPEG, MOV, AVI
- **Any filter**: No restrictions

#### Helper Functions
- **`getFileExtension(filename)`** - Extract file extension
- **`generateUniqueFilename(originalName)`** - Generate unique filename
- **`handleMulterError(error)`** - Multer error handler middleware

Features:
- **Memory storage** - Files stored in memory as Buffer (ideal for S3)
- **Type validation** - File type checking before upload
- **Size limits** - Per-file size limits
- **Error handling** - Comprehensive error messages

### ✅ Upload Controller (`src/controllers/upload.controller.ts`)

Controller with 10 endpoints:

1. **`uploadSingleImage`** - Upload single image (general purpose)
2. **`uploadMultipleImages`** - Upload multiple images (general purpose)
3. **`uploadProductImages`** - Upload product images with ProductImage records
4. **`uploadCategoryImage`** - Upload category image
5. **`uploadUserAvatar`** - Upload user avatar (max 5MB)
6. **`deleteImage`** - Delete image from S3 by key
7. **`deleteProductImage`** - Delete product image (S3 + database)
8. **`getSignedUrl`** - Get signed URL for private file access
9. **`getFileMetadata`** - Get file metadata from S3
10. **`healthCheck`** - Health check for upload service

Features:
- **File validation** before upload
- **ProductImage records** created automatically for product uploads
- **Primary image** detection (first image is primary)
- **Sort order** management for product images
- **Error handling** with proper HTTP status codes
- **Success responses** with file metadata

### ✅ Upload Routes (`src/routes/upload.routes.ts`)

RBAC-protected upload routes:

```typescript
// Public
GET  /api/v1/upload/health

// Authenticated (any user)
POST /api/v1/upload/image              - Upload single image
POST /api/v1/upload/images             - Upload multiple images
POST /api/v1/upload/avatar             - Upload user avatar
GET  /api/v1/upload/signed-url         - Get signed URL
GET  /api/v1/upload/metadata           - Get file metadata
DELETE /api/v1/upload/image            - Delete image

// RBAC Protected
POST /api/v1/upload/product-images     - UPLOAD_PRODUCT_IMAGES
POST /api/v1/upload/category-image     - UPLOAD_CATEGORY_IMAGES
DELETE /api/v1/upload/product-image/:id - DELETE_PRODUCT_IMAGES
```

Features:
- **Multer middleware** integration
- **Error handling** with handleMulterError
- **RBAC authorization** using permission middleware
- **Authentication** required for all endpoints except health check

### ✅ Application Integration

Updated `src/app.ts`:
1. Imported `testS3Connection` from AWS config
2. Added upload routes to Express app
3. Added S3 connection test to startup sequence

Startup sequence:
```
✅ Database connection established
✅ Database models synchronized
✅ Redis connection established
✅ Redis PING successful
✅ AWS S3 configuration loaded
   Region: us-east-1
   Bucket: sandbox-neob-bucket
🚀 Server running on port 1337
```

### ✅ Additional Files

**`src/utils/errors.ts`** - Added BadRequestError:
```typescript
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}
```

## Package Installation

Installed AWS SDK packages:
```bash
npm install @aws-sdk/s3-request-presigner
```

Already installed:
- `@aws-sdk/client-s3@^3.988.0`
- `multer@^2.0.2`
- `@types/multer@^2.0.0`

## Usage Examples

### Upload Single Image
```bash
curl -X POST http://localhost:1337/api/v1/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/image.jpg"
```

Response:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://sandbox-neob-bucket.s3.us-east-1.amazonaws.com/images/uuid.jpg",
    "key": "images/uuid.jpg",
    "size": 125440,
    "mimeType": "image/jpeg",
    "originalName": "image.jpg"
  }
}
```

### Upload Product Images
```bash
curl -X POST http://localhost:1337/api/v1/upload/product-images \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "product_id=product-uuid"
```

Response:
```json
{
  "success": true,
  "message": "2 product images uploaded successfully",
  "data": [
    {
      "id": "uuid-1",
      "product_id": "product-uuid",
      "url": "https://sandbox-neob-bucket.s3.us-east-1.amazonaws.com/products/uuid1.jpg",
      "is_primary": true,
      "sort_order": 0
    },
    {
      "id": "uuid-2",
      "product_id": "product-uuid",
      "url": "https://sandbox-neob-bucket.s3.us-east-1.amazonaws.com/products/uuid2.jpg",
      "is_primary": false,
      "sort_order": 1
    }
  ]
}
```

### Upload Category Image
```bash
curl -X POST http://localhost:1337/api/v1/upload/category-image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/category.jpg"
```

### Upload User Avatar
```bash
curl -X POST http://localhost:1337/api/v1/upload/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/avatar.jpg"
```

### Delete Product Image
```bash
curl -X DELETE http://localhost:1337/api/v1/upload/product-image/uuid \
  -H "Authorization: Bearer $TOKEN"
```

### Get Signed URL
```bash
curl -X GET "http://localhost:1337/api/v1/upload/signed-url?key=images/uuid.jpg&expiresIn=3600" \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "signedUrl": "https://sandbox-neob-bucket.s3.us-east-1.amazonaws.com/images/uuid.jpg?X-Amz-Algorithm=...",
    "expiresIn": 3600
  }
}
```

### Get File Metadata
```bash
curl -X GET "http://localhost:1337/api/v1/upload/metadata?key=images/uuid.jpg" \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "size": 125440,
    "mimeType": "image/jpeg",
    "format": "jpeg"
  }
}
```

### Health Check
```bash
curl -X GET http://localhost:1337/api/v1/upload/health
```

## Architecture

### File Upload Flow
```
1. Client sends multipart/form-data request
2. Multer middleware captures file in memory
3. File validation (type, size)
4. Upload service uploads to S3
5. ProductImage record created (if product upload)
6. Response with file URL and metadata
```

### File Organization in S3
```
bucket-name/
├── products/
│   ├── uuid1.jpg
│   ├── uuid2.jpg
│   └── ...
├── categories/
│   ├── uuid3.jpg
│   └── ...
├── avatars/
│   ├── uuid4.jpg
│   └── ...
└── images/
    ├── uuid5.jpg
    └── ...
```

### URL Structure
```
S3 URL: https://{bucket}.s3.{region}.amazonaws.com/{key}
CDN URL: https://{cdn-domain}/{key} (if configured)
```

## Security Features

1. **RBAC Protection** - Permission-based access control
2. **Authentication Required** - JWT token validation
3. **File Type Validation** - Only allowed MIME types
4. **File Size Limits** - Prevent large file uploads
5. **Signed URLs** - Temporary access for private files
6. **Public ACL** - Files are publicly readable (configurable)

## Error Handling

All endpoints handle errors properly:
- **400 Bad Request** - Invalid input, file type, or size
- **401 Unauthorized** - Missing or invalid JWT token
- **403 Forbidden** - Missing required permissions
- **404 Not Found** - File or resource not found
- **500 Internal Server Error** - S3 or server errors

## Files Created/Modified

### Created
1. `src/config/aws.ts` - S3 client configuration
2. `src/services/upload.service.ts` - Upload service (15+ methods)
3. `src/config/multer.ts` - Multer configuration
4. `src/controllers/upload.controller.ts` - Upload controller (10 endpoints)
5. `src/routes/upload.routes.ts` - Upload routes with RBAC
6. `WEEK_2_DAY_5_COMPLETE.md` - This documentation

### Modified
1. `src/app.ts` - Added upload routes and S3 connection test
2. `src/utils/errors.ts` - Added BadRequestError
3. `src/utils/jwt.ts` - Fixed TypeScript type issues with expiresIn
4. `package.json` - Added @aws-sdk/s3-request-presigner

## Testing

### Manual Testing
Server starts successfully with:
```
✅ AWS S3 configuration loaded
   Region: us-east-1
   Bucket: sandbox-neob-bucket
```

### Integration Testing
All upload endpoints are available at:
- http://localhost:1337/api/v1/upload/*

### Testing with Real S3 Bucket
To test with actual S3 uploads:
1. Configure AWS credentials in `.env`
2. Create an S3 bucket or use existing
3. Update AWS_BUCKET in `.env`
4. Use curl commands above to test uploads

## Next Steps - Week 3: API Endpoints

Now that the foundation is complete (models, auth, RBAC, S3), proceed with implementing business logic:

- [ ] Products API (CRUD with RBAC)
- [ ] Categories API (CRUD with RBAC)
- [ ] Orders API (OMS with status management)
- [ ] Users API (User management with RBAC)
- [ ] Reviews API (Product reviews)
- [ ] Wishlist API (Customer wishlist)
- [ ] Cart API (Shopping cart)
- [ ] Coupons API (Discount management)
- [ ] Analytics API (Dashboard and reports)

## Key Achievements

✅ **AWS S3 Integration** with full upload/download capabilities
✅ **Upload Service** with 15+ methods for file operations
✅ **Multer Configuration** with memory storage for direct S3 upload
✅ **Upload Controller** with 10 endpoints
✅ **RBAC Protected Routes** using permission middleware
✅ **Multiple Upload Types** (single, multiple, product, category, avatar)
✅ **File Validation** (type, size, format)
✅ **ProductImage Integration** - automatic record creation
✅ **Signed URLs** for temporary file access
✅ **CDN Support** - CloudFront URL configuration
✅ **Error Handling** with proper HTTP status codes
✅ **Comprehensive Documentation** with usage examples

## Notes

- Files are uploaded directly from memory to S3 (no local storage)
- ProductImage model stores only URLs (S3 keys)
- First uploaded image is automatically marked as primary
- Unique filenames generated using UUID v4
- Supports CDN URLs (CloudFront) for better performance
- All endpoints require authentication except health check
- Product and category uploads require specific permissions
- Signed URLs expire after 1 hour by default (configurable)

Ready for Week 3: API Endpoints implementation! 🚀
