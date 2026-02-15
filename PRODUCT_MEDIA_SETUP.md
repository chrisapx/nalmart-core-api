# Product Media Implementation - Changes Summary

## What Was Fixed

Your product submission flow now has a complete end-to-end media handling system that properly:

1. **Uploads images and videos to AWS S3** after product creation
2. **Saves URLs and metadata** to the database for later retrieval
3. **Organizes media by type** when fetching products (coverImage, gallery[], demoImages[], demoVideos[], galleryVideos[])
4. **Allows deletion of individual media assets** both during editing and independently
5. **Reconstructs URLs for preview** when editing products

## Files Modified

### 1. [ProductService](src/services/product.service.ts)
**Added Methods:**
- `organizeProductMedia()` - Organizes images/videos by type for API responses
- `uploadProductMedia()` - Uploads media files to S3 and saves to database
- `deleteProductImage()` - Deletes image from S3 and database
- `deleteProductVideo()` - Deletes video from S3 and database
- `extractS3KeyFromUrl()` - Extracts S3 key from URL for deletion

**Updated Methods:**
- `createProduct()` - Now calls `uploadProductMedia()` after product creation
- `updateProduct()` - Handles media uploads and deletions
- `getProductById()` - Now includes images/videos and organizes them
- `getProductBySlug()` - Now includes images/videos and organizes them
- `getProducts()` - Now includes images/videos and organizes them
- `getFeaturedProducts()` - Now includes videos
- `getRelatedProducts()` - Now includes videos

### 2. [Product Controller](src/controllers/product.controller.ts)
**Added Methods:**
- `deleteProductImage()` - Endpoint handler for image deletion
- `deleteProductVideo()` - Endpoint handler for video deletion

**Updated Methods:**
- `createProduct()` - Updated success message to mention media

### 3. [Product Routes](src/routes/product.routes.ts)
**Added Routes:**
```
DELETE /api/products/media/image/:imageId
DELETE /api/products/media/video/:videoId
```

### 4. [Product Validator](src/validators/product.validator.ts)
**Added Schemas:**
- `mediaDeleteSchema` - Validates media deletion payloads
- `updateProductWithMediaSchema` - Supports deletedImageIds and deletedVideoIds

### 5. [ProductImage Model](src/models/ProductImage.ts)
**No changes needed** - Already has image_type field for categorization

### 6. [ProductVideo Model](src/models/ProductVideo.ts)
**No changes needed** - Already has video_type field for categorization

## Implementation Guide for Frontend

### Step 1: Product Creation Form
Collect product details and media files:

```typescript
interface ProductFormData {
  // Product details
  name: string;
  description: string;
  price: number;
  category_id?: number;
  // ... other fields
  
  // Media files
  imageFiles: File[]; // Images uploaded by user
  videoFiles: File[]; // Videos uploaded by user
}
```

### Step 2: Submit Product with Media
```typescript
async function submitProduct(formData: ProductFormData) {
  const payload = new FormData();
  
  // Add product details as JSON
  payload.append('data', JSON.stringify({
    name: formData.name,
    description: formData.description,
    price: formData.price,
    category_id: formData.category_id,
    // ... other fields
  }));
  
  // Add image files
  formData.imageFiles.forEach(file => {
    payload.append('image_files', file);
  });
  
  // Add video files
  formData.videoFiles.forEach(file => {
    payload.append('video_files', file);
  });
  
  const response = await fetch('/api/products', {
    method: 'POST',
    body: payload,
    // Don't set Content-Type header - let browser set it with boundary
  });
  
  const result = await response.json();
  return result.data; // Product with organized media
}
```

### Step 3: Display Product with Organized Media
After submitting or fetching a product, use the organized media structure:

```typescript
const product = await fetch(`/api/products/${productId}`).then(r => r.json()).then(d => d.data);

// Access media by organized type
console.log(product.coverImage);      // Single primary image
console.log(product.gallery);         // Gallery images []
console.log(product.demoImages);      // Demo images []
console.log(product.demoVideos);      // Demo videos []
console.log(product.galleryVideos);   // Gallery videos []

// Render cover image
<img src={product.coverImage.url} alt={product.coverImage.alt_text} />

// Render gallery
{product.gallery.map(img => (
  <img key={img.id} src={img.url} alt={img.name} />
))}

// Render videos
{product.demoVideos.map(video => (
  <video key={video.id} src={video.url} controls />
))}
```

### Step 4: Edit Product with Media
When editing, you can:
- Keep existing media (leave them as is)
- Add new media (upload new files)
- Delete existing media (specify IDs to delete)

```typescript
async function updateProduct(
  productId: number,
  updates: Partial<ProductFormData>,
  deletedImageIds: number[] = [],
  deletedVideoIds: number[] = []
) {
  const payload = new FormData();
  
  payload.append('data', JSON.stringify({
    ...updates,
    deletedImageIds,
    deletedVideoIds,
  }));
  
  // Add new images if any
  updates.imageFiles?.forEach(file => {
    payload.append('image_files', file);
  });
  
  // Add new videos if any
  updates.videoFiles?.forEach(file => {
    payload.append('video_files', file);
  });
  
  const response = await fetch(`/api/products/${productId}`, {
    method: 'PUT',
    body: payload,
  });
  
  return response.json();
}
```

### Step 5: Reconstruct Preview from URLs (Edit Mode)
When loading a product for editing, convert URLs back to preview format:

```typescript
interface EditProductFormState {
  productDetails: Partial<ProductFormData>;
  
  // Existing media (from database URLs)
  existingCoverImage?: { id: number; url: string; name: string };
  existingGallery: Array<{ id: number; url: string; name: string }>;
  existingDemoImages: Array<{ id: number; url: string; name: string }>;
  existingDemoVideos: Array<{ id: number; url: string; title: string }>;
  existingGalleryVideos: Array<{ id: number; url: string; title: string }>;
  
  // New media being added
  newImageFiles: File[];
  newVideoFiles: File[];
  
  // Media to delete
  deletedImageIds: number[];
  deletedVideoIds: number[];
}

// Load product
const product = await fetch(`/api/products/${productId}`).then(r => r.json()).then(d => d.data);

const editState: EditProductFormState = {
  productDetails: {
    name: product.name,
    description: product.description,
    // ... other fields
  },
  existingCoverImage: product.coverImage,
  existingGallery: product.gallery,
  existingDemoImages: product.demoImages,
  existingDemoVideos: product.demoVideos,
  existingGalleryVideos: product.galleryVideos,
  newImageFiles: [],
  newVideoFiles: [],
  deletedImageIds: [],
  deletedVideoIds: [],
};

// UI can now show previews from existing URLs
// Users can add new images/videos
// Users can delete any image/video by ID
```

### Step 6: Delete Individual Media
```typescript
async function deleteProductImage(imageId: number) {
  const response = await fetch(`/api/products/media/image/${imageId}`, {
    method: 'DELETE',
  });
  return response.json();
}

async function deleteProductVideo(videoId: number) {
  const response = await fetch(`/api/products/media/video/${videoId}`, {
    method: 'DELETE',
  });
  return response.json();
}

// Or delete during batch update
await updateProduct(productId, updates, [imageId1, imageId2], [videoId1]);
```

## API Endpoints Reference

### Get All Products (with organized media)
```
GET /api/products?page=1&limit=20
Response includes: coverImage, gallery[], demoImages[], demoVideos[], galleryVideos[]
```

### Get Single Product (with organized media)
```
GET /api/products/:id
GET /api/products/slug/:slug
Response includes: coverImage, gallery[], demoImages[], demoVideos[], galleryVideos[]
```

### Create Product with Media
```
POST /api/products
Content-Type: multipart/form-data
- data: JSON string of product details
- image_files: file array
- video_files: file array
```

### Update Product with Media
```
PUT /api/products/:id
Content-Type: multipart/form-data
- data: JSON string including deletedImageIds, deletedVideoIds
- image_files: new image files (optional)
- video_files: new video files (optional)
```

### Delete Image
```
DELETE /api/products/media/image/:imageId
```

### Delete Video
```
DELETE /api/products/media/video/:videoId
```

## Key Points to Remember

✅ **Always use multipart/form-data** when uploading files - put product JSON in 'data' field

✅ **Don't set Content-Type header** - let the browser set it with multipart boundary

✅ **Media is automatically organized** - don't manually categorize, server handles it

✅ **URLs are ready to use** - S3 URLs are public and can be used directly in img/video tags

✅ **First image is always cover** - the first image uploaded becomes the cover/primary image

✅ **Edit without losing media** - existing media persists unless you specify deletedImageIds/deletedVideoIds

✅ **Video metadata is available** - duration, platform, external_id are stored for each video

## Troubleshooting Checklist

- [ ] Using `multipart/form-data` for file uploads?
- [ ] Putting product JSON in the `data` field?
- [ ] Appending files to `image_files` or `video_files`?
- [ ] Checking response includes organized media (coverImage, gallery[], etc.)?
- [ ] Using media URLs directly (they're public S3 URLs)?
- [ ] Passing image/video IDs when deleting?
- [ ] Handling deletedImageIds/deletedVideoIds in update requests?

## Example Frontend Component

```typescript
export const ProductMediaForm: React.FC = () => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    imageFiles: [] as File[],
    videoFiles: [] as File[],
  });
  
  const [loadedProduct, setLoadedProduct] = useState(null);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
  const [deletedVideoIds, setDeletedVideoIds] = useState<number[]>([]);
  
  const handleImageDelete = (imageId: number) => {
    setDeletedImageIds([...deletedImageIds, imageId]);
  };
  
  const handleVideoDelete = (videoId: number) => {
    setDeletedVideoIds([...deletedVideoIds, videoId]);
  };
  
  const handleSubmit = async () => {
    const formData = new FormData();
    
    formData.append('data', JSON.stringify({
      name: product.name,
      description: product.description,
      price: product.price,
      deletedImageIds,
      deletedVideoIds,
    }));
    
    product.imageFiles.forEach(file => {
      formData.append('image_files', file);
    });
    
    product.videoFiles.forEach(file => {
      formData.append('video_files', file);
    });
    
    const response = await fetch('/api/products', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    setLoadedProduct(result.data);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {loadedProduct?.coverImage && (
        <div>
          <img src={loadedProduct.coverImage.url} alt="Cover" />
          <button onClick={() => handleImageDelete(loadedProduct.coverImage.id)}>
            Delete Cover
          </button>
        </div>
      )}
      {loadedProduct?.gallery.map(img => (
        <div key={img.id}>
          <img src={img.url} alt={img.name} />
          <button onClick={() => handleImageDelete(img.id)}>Delete</button>
        </div>
      ))}
    </form>
  );
};
```

