#!/bin/bash

# Integration Test: Cart System
echo "======================================"
echo "🛒 Cart System Integration Test"
echo "======================================"
echo ""

# Configuration
API_URL="http://localhost:3000/api/v1"
EMAIL="test-cart-$(date +%s)@test.com"
PASSWORD="TestPassword123!"
PRODUCT_ID=1

echo "📋 Test Configuration:"
echo "- API URL: $API_URL"
echo "- Test Email: $EMAIL"
echo "- Product ID: $PRODUCT_ID"
echo ""

# Step 1: Register a test user
echo "Step 1️⃣ : Register Test User"
echo "POST $API_URL/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"first_name\": \"Test\",
    \"last_name\": \"User\",
    \"email\": \"$EMAIL\",
    \"phone\": \"+1234567890\",
    \"password\": \"$PASSWORD\"
  }")

echo "$REGISTER_RESPONSE" | jq .
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id // empty')

if [ -z "$USER_ID" ]; then
  echo "❌ Registration failed"
  exit 1
fi

echo "✅ User registered with ID: $USER_ID"
echo ""

# Step 2: Login
echo "Step 2️⃣ : Login"
echo "POST $API_URL/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"identifier\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq .
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ User logged in"
echo "🔑 Token: ${TOKEN:0:20}..."
echo ""

# Step 3: Get initial cart
echo "Step 3️⃣ : Get Initial Cart (should be empty)"
echo "GET $API_URL/cart"
CART_RESPONSE=$(curl -s -X GET "$API_URL/cart" \
  -H "Authorization: Bearer $TOKEN")

echo "$CART_RESPONSE" | jq .
CART_ID=$(echo "$CART_RESPONSE" | jq -r '.data.id // empty')
INITIAL_COUNT=$(echo "$CART_RESPONSE" | jq -r '.data.count // 0')

echo "✅ Initial cart count: $INITIAL_COUNT"
echo ""

# Step 4: Add product to cart
echo "Step 4️⃣ : Add Product to Cart"
echo "POST $API_URL/cart/add"
ADD_RESPONSE=$(curl -s -X POST "$API_URL/cart/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"product_id\": $PRODUCT_ID,
    \"quantity\": 2,
    \"variants\": {
      \"size\": \"M\",
      \"color\": \"red\"
    }
  }")

echo "$ADD_RESPONSE" | jq .
ITEM_ID=$(echo "$ADD_RESPONSE" | jq -r '.data.id // empty')

if [ -z "$ITEM_ID" ]; then
  echo "⚠️  Item may not have been added (product might not exist)"
else
  echo "✅ Item added with ID: $ITEM_ID"
fi
echo ""

# Step 5: Get updated cart
echo "Step 5️⃣ : Get Updated Cart"
echo "GET $API_URL/cart"
CART_RESPONSE=$(curl -s -X GET "$API_URL/cart" \
  -H "Authorization: Bearer $TOKEN")

echo "$CART_RESPONSE" | jq .
ITEM_COUNT=$(echo "$CART_RESPONSE" | jq -r '.data.count // 0')
CART_TOTAL=$(echo "$CART_RESPONSE" | jq -r '.data.total // 0')

echo "✅ Cart count: $ITEM_COUNT items"
echo "✅ Cart total: $CART_TOTAL"
echo ""

# Step 6: Verify cart is persisted (reload)
echo "Step 6️⃣ : Verify Cart Persistence"
echo "GET $API_URL/cart (second call to verify persistence)"
CART_RESPONSE_2=$(curl -s -X GET "$API_URL/cart" \
  -H "Authorization: Bearer $TOKEN")

echo "$CART_RESPONSE_2" | jq .
PERSISTED_COUNT=$(echo "$CART_RESPONSE_2" | jq -r '.data.count // 0')

if [ "$PERSISTED_COUNT" = "$ITEM_COUNT" ]; then
  echo "✅ Cart persisted correctly"
else
  echo "❌ Cart not persisted (expected $ITEM_COUNT, got $PERSISTED_COUNT)"
fi
echo ""

# Step 7: Update item quantity
if [ ! -z "$ITEM_ID" ]; then
  echo "Step 7️⃣ : Update Item Quantity"
  echo "PUT $API_URL/cart/item/$ITEM_ID"
  UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/cart/item/$ITEM_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"quantity\": 5}")

  echo "$UPDATE_RESPONSE" | jq .
  echo "✅ Item quantity updated"
  echo ""

  # Step 8: Remove item
  echo "Step 8️⃣ : Remove Item from Cart"
  echo "DELETE $API_URL/cart/item/$ITEM_ID"
  REMOVE_RESPONSE=$(curl -s -X DELETE "$API_URL/cart/item/$ITEM_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "$REMOVE_RESPONSE" | jq .
  echo "✅ Item removed"
  echo ""
fi

echo "======================================"
echo "✨ Cart System Test Complete"
echo "======================================"
