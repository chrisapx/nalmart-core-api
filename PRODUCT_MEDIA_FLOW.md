# Product Media Submission & Management Flow

## Overview
This document explains the complete product submission flow with media handling, including image uploads, storage, retrieval, and deletion.

## Architecture Flow

### 1. **Product Creation Flow**
```
Frontend Form → Product Details + Media Files
    ↓
POST /api/products (multipart/form-data)
    ↓
productController.createProduct()
    ↓
ProductService.createProduct()
    ├─ Save product details to database
    ├─ Upload images to AWS S3
    ├─ Upload videos to AWS S3
    └─ Save image/video URLs to database
    ↓
getProductById() → Organize media by type
    ↓
Response: Product with organized media
```

### 2. **Product Fetch Flow**
```
GET /api/products/:id
    ↓
ProductService.getProductById()
    ↓
Fetch product with images and videos
    ↓
organizeProductMedia()
    ├─ coverImage → single primary image
    ├─ gallery[] → gallery images
    ├─ demoImages[] → demonstration images
    ├─ demoVideos[] → demo/tutorial videos
    └─ galleryVideos[] → gallery/review/unboxing videos
    ↓
Response: Product with organized media structure
```

### 3. **Product Update Flow (with Media)**
```
Frontend Edit Form → Updated Details + New Media Files + Deleted Media IDs
    ↓
PUT /api/products/:id (multipart/form-data)
    ↓
productController.updateProduct()
    ↓
ProductService.updateProduct()
    ├─ Update product details
    ├─ Upload new media files (if provided)
    ├─ Delete specified media assets (if deletedImageIds/deletedVideoIds provided)
    └─ Fetch and organize updated product
    ↓
Response: Updated product with organized media
```

### 4. **Media Deletion Flow**
```
DELETE /api/products/media/image/:imageId
    ↓
productController.deleteProductImage()
    ↓
ProductService.deleteProductImage()
    ├─ Extract S3 key from URL
    ├─ Delete from S3
    └─ Delete from database
    ↓
Response: Success
```

## Request/Response Formats

### Create Product with Media
**Request:**
```http
POST /api/products
Content-Type: multipart/form-data

Form Fields:
- data: {
    "name": "Product Name",
    "description": "...",
    "price": 99.99,
    ...other product fields
  }
- image_files: [file1.jpg, file2.png, ...]
- video_files: [video1.mp4, video2.mov, ...]
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully with media",
  "data": {
    "id": 1,
    "name": "Product Name",
    "price": 99.99,
    "coverImage": {
      "id": 1,
      "url": "https://s3.amazonaws.com/...",
      "name": "image1.jpg",
      "alt_text": null,
      "width": 1920,
      "height": 1080
    },
    "gallery": [
      {
        "id": 2,
        "url": "https://s3.amazonaws.com/...",
        "name": "image2.jpg",
        "sort_order": 1
      }
    ],
    "demoImages": [],
    "demoVideos": [
      {
        "id": 1,
        "url": "https://s3.amazonaws.com/...",
        "title": "Demo Video",
        "platform": "local",
        "duration": 120
      }
    ],
    "galleryVideos": []
  }
}
```

### Update Product with Media
**Request:**
```http
PUT /api/products/1
Content-Type: multipart/form-data

Form Fields:
- data: {
    "name": "Updated Name",
    "description": "...",
    "deletedImageIds": [2, 3],
    "deletedVideoIds": [1]
  }
- image_files: [newimage.jpg]
- video_files: []
```

**Response:** Same structure as create, but with updated values.

### Delete Media Asset
**Request:**
```http
DELETE /api/products/media/image/2
DELETE /api/products/media/video/1
```

**Response:**
```json
{
  "success": true,
  "message": "Product image deleted successfully",
  "data": null
}
```

## Media Organization Fields

### Image Types
- **coverImage** (primary): Single main product image displayed in product cards and detail pages
- **gallery[]**: Additional product images shown in gallery slider
- **demoImages[]**: Images showing product usage or demonstrations

### Video Types
- **demoVideos[]**: Demo, tutorial, or how-to videos
- **galleryVideos[]**: Review, unboxing, or general gallery videos

## Database Schema

### product_images Table
```
id (BIGINT PK)
product_id (BIGINT FK)
url (VARCHAR 1000) - S3 URL
name (VARCHAR 255) - Original filename
alt_text (VARCHAR 255) - SEO alt text
is_primary (BOOLEAN) - Whether it's the cover image
image_type (ENUM: 'cover', 'gallery', 'demo')
sort_order (INTEGER) - Position in list
width (INTEGER) - Image width in pixels
height (INTEGER) - Image height in pixels
size (INTEGER) - File size in bytes
mime_type (VARCHAR 50) - Content type
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### product_videos Table
```
id (BIGINT PK)
product_id (BIGINT FK)
url (VARCHAR 1000) - S3 URL or external URL
title (VARCHAR 255)
description (TEXT)
thumbnail_url (VARCHAR 1000)
video_type (ENUM: 'demo', 'tutorial', 'review', 'unboxing')
platform (ENUM: 'local', 'youtube', 'vimeo', 'external')
external_id (VARCHAR 255) - YouTube/Vimeo ID
duration (INTEGER) - Duration in seconds
size (INTEGER) - File size (for local uploads)
mime_type (VARCHAR 50)
sort_order (INTEGER)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

## File Upload Settings

### Size Limits
- **Images**: 10 MB per file, max 20 files per product
- **Videos**: 100 MB per file, max 10 files per product

### Allowed MIME Types
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, MPEG, MOV, AVI

## Frontend Integration Guide

### 1. Create Product with Media
```javascript
const formData = new FormData();

// Add product details
formData.append('data', JSON.stringify({
  name: 'Product Name',
  description: 'Product description',
  price: 99.99,
  category_id: 1
}));

// Add images
for (const imageFile of selectedImages) {
  formData.append('image_files', imageFile);
}

// Add videos
for (const videoFile of selectedVideos) {
  formData.append('video_files', videoFile);
}

const response = await fetch('/api/products', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Product created:', result.data);
```

### 2. Edit Product with Media
```javascript
const formData = new FormData();

// Add updated product details
formData.append('data', JSON.stringify({
  name: 'Updated Name',
  description: 'Updated description',
  // Media IDs to delete
  deletedImageIds: [2, 3],
  deletedVideoIds: [1]
}));

// Add new media files
for (const newImageFile of newImages) {
  formData.append('image_files', newImageFile);
}

for (const newVideoFile of newVideos) {
  formData.append('video_files', newVideoFile);
}

const response = await fetch(`/api/products/${productId}`, {
  method: 'PUT',
  body: formData
});

const result = await response.json();
console.log('Product updated:', result.data);
```

### 3. Reconstruct Blobs for Preview (Edit Form)
```javascript
// When loading product for editing, use the URLs to display previews
const product = await fetch(`/api/products/${productId}`).then(r => r.json());

// Display coverImage
if (product.data.coverImage) {
  const img = document.createElement('img');
  img.src = product.data.coverImage.url;
  previewContainer.appendChild(img);
}

// Display gallery images
product.data.gallery.forEach(image => {
  const img = document.createElement('img');
  img.src = image.url;
  galleryContainer.appendChild(img);
});

// Display videos
product.data.demoVideos.forEach(video => {
  const video_el = document.createElement('video');
  video_el.src = video.url;
  video_el.controls = true;
  videoContainer.appendChild(video_el);
});
```

### 4. Delete Media Asset
```javascript
// Delete a specific image
const imageId = 2;
await fetch(`/api/products/media/image/${imageId}`, {
  method: 'DELETE'
});

// Delete a specific video
const videoId = 1;
await fetch(`/api/products/media/video/${videoId}`, {
  method: 'DELETE'
});
```

## Key Features

✅ **Automatic Media Organization**: Images and videos are automatically organized by type when fetching products

✅ **S3 Integration**: All files are uploaded to AWS S3 with public URLs for instant access

✅ **Metadata Storage**: Image/video metadata (size, dimensions, duration) is stored for future use

✅ **Easy Deletion**: Delete individual media assets without affecting the product

✅ **Sorting Support**: Media assets maintain sort order for custom arrangement

✅ **Type Classification**: Automatic classification of media into cover, gallery, demo, etc.

✅ **Error Handling**: Media upload failures don't prevent product creation

## Error Handling

### Media Upload Failures
If media uploads fail, the product is still created, but errors are logged. The API returns:
```json
{
  "success": true,
  "message": "Product created successfully with media",
  "data": { ... },
  "warnings": ["Some files failed to upload"]
}
```

### S3 Key Extraction
The system automatically extracts S3 keys from URLs when deleting to handle various S3 URL formats:
- `https://bucket.s3.region.amazonaws.com/key/path`
- `https://s3.region.amazonaws.com/bucket/key/path`

## Troubleshooting

### Images Not Appearing
1. Verify files were attached to the request
2. Check S3 bucket policies allow public read
3. Ensure image_type is set correctly (cover, gallery, demo)
4. Verify URLs in database are accessible

### Videos Not Playing
1. Check platform field matches actual source (local, youtube, vimeo, external)
2. For YouTube/Vimeo, verify external_id is correct
3. For local videos, verify S3 URL is accessible and CORS is configured

### Media Deletion Fails
1. Ensure image/video ID exists
2. Verify S3 bucket has delete permissions
3. Check if file still exists in S3

## Performance Considerations

- **Lazy Load Videos**: Videos with platform='external' load from external sources (no bandwidth cost)
- **Image Optimization**: Consider frontend image optimization/compression before upload
- **Batch Deletion**: Delete multiple media assets efficiently using the individual endpoints
- **Pagination**: When listing products, media is included up to the product list limit

## Future Enhancements

- [ ] Image compression during upload
- [ ] Video transcoding for multiple quality levels
- [ ] Advanced image metadata extraction (EXIF, dominant colors)
- [ ] Video thumbnail generation
- [ ] Bulk media operations
- [ ] Media usage analytics
- [ ] Advanced sorting/filtering by media type

