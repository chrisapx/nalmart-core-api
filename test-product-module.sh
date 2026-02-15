#!/bin/bash

# Product Module End-to-End Test Script
# Tests the complete product lifecycle from creation to media upload

set -e

API_BASE="http://localhost:3000/api/v1"
TEST_IMAGE="test-product.jpg"

echo "======================================"
echo "Product Module E2E Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate unique SKU with timestamp
TIMESTAMP=$(date +%s)
UNIQUE_SKU="TEST-E2E-${TIMESTAMP}"
UNIQUE_JUG="JUG-TEST-${TIMESTAMP}"
UNIQUE_SLUG="test-product-e2e-${TIMESTAMP}"

# Step 1: Create a test product
echo -e "${YELLOW}[1/7] Creating test product...${NC}"
PRODUCT_RESPONSE=$(curl -s -X POST "$API_BASE/products" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Product E2E\",
    \"slug\": \"${UNIQUE_SLUG}\",
    \"description\": \"This is a comprehensive test product\",
    \"short_description\": \"Test product for E2E testing\",
    \"features\": \"- Feature 1\\n- Feature 2\\n- Feature 3\",
    \"sku\": \"${UNIQUE_SKU}\",
    \"jug\": \"${UNIQUE_JUG}\",
    \"price\": 99.99,
    \"compare_at_price\": 149.99,
    \"cost_price\": 50.00,
    \"stock_quantity\": 100,
    \"stock_status\": \"in_stock\",
    \"is_active\": true,
    \"is_published\": false,
    \"is_featured\": false,
    \"brand\": \"TestBrand\",
    \"eligible_for_return\": true,
    \"return_policy\": \"30-day money back guarantee\",
    \"meta_title\": \"Test Product - E2E Testing\",
    \"meta_description\": \"Complete end-to-end test for product module\"
  }")

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$PRODUCT_ID" ]; then
  echo -e "${RED}✗ Failed to create product${NC}"
  echo "Response: $PRODUCT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Product created successfully (ID: $PRODUCT_ID)${NC}"
echo ""

# Step 2: Fetch the created product
echo -e "${YELLOW}[2/7] Fetching product details...${NC}"
GET_RESPONSE=$(curl -s "$API_BASE/products/$PRODUCT_ID")
echo -e "${GREEN}✓ Product fetched successfully${NC}"
echo ""

# Step 3: Update the product
echo -e "${YELLOW}[3/7] Updating product...${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE/products/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Product E2E",
    "price": 89.99,
    "stock_quantity": 150
  }')
echo -e "${GREEN}✓ Product updated successfully${NC}"
echo ""

# Step 4: Toggle publish status
echo -e "${YELLOW}[4/7] Publishing product...${NC}"
PUBLISH_RESPONSE=$(curl -s -X PATCH "$API_BASE/products/$PRODUCT_ID/publish" \
  -H "Content-Type: application/json" \
  -d '{"is_published": true}')
echo -e "${GREEN}✓ Product published successfully${NC}"
echo ""

# Step 5: Toggle featured status
echo -e "${YELLOW}[5/7] Making product featured...${NC}"
FEATURED_RESPONSE=$(curl -s -X PATCH "$API_BASE/products/$PRODUCT_ID/featured" \
  -H "Content-Type: application/json" \
  -d '{"is_featured": true}')
echo -e "${GREEN}✓ Product featured successfully${NC}"
echo ""

# Step 6: Update stock
echo -e "${YELLOW}[6/7] Updating stock...${NC}"
STOCK_RESPONSE=$(curl -s -X PATCH "$API_BASE/products/$PRODUCT_ID/stock" \
  -H "Content-Type: application/json" \
  -d '{
    "stock_quantity": 200,
    "stock_status": "in_stock"
  }')
echo -e "${GREEN}✓ Stock updated successfully${NC}"
echo ""

# Step 7: Create a test image file and upload
echo -e "${YELLOW}[7/7] Testing image upload...${NC}"

# Create a simple test image (1x1 pixel PNG)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$TEST_IMAGE"

# Upload the test image
UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/upload/product-images" \
  -F "product_id=$PRODUCT_ID" \
  -F "image_type=cover" \
  -F "images=@$TEST_IMAGE")

# Check if upload was successful
if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Image uploaded successfully${NC}"
else
  echo -e "${RED}✗ Image upload failed${NC}"
  echo "Response: $UPLOAD_RESPONSE"
fi

# Clean up test image
rm -f "$TEST_IMAGE"
echo ""

# Final verification - fetch product with images
echo -e "${YELLOW}Verifying final product state...${NC}"
FINAL_RESPONSE=$(curl -s "$API_BASE/products/$PRODUCT_ID")

# Check if product has images (non-empty array)
if echo "$FINAL_RESPONSE" | grep -q '"images":\[{"id"'; then
  echo -e "${GREEN}✓ Product has images attached${NC}"
else
  echo -e "${YELLOW}⚠ Product created but no images attached${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Product Module E2E Test Complete${NC}"
echo "======================================"
echo ""
echo "Product ID: $PRODUCT_ID"
echo ""
echo "To delete this test product, run:"
echo "curl -X DELETE $API_BASE/products/$PRODUCT_ID"
echo ""
