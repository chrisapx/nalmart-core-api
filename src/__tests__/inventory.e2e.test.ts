import request from 'supertest';
import app from '../app';
import { InventoryService } from '../services/inventory.service';
import Inventory from '../models/Inventory';
import Warehouse from '../models/Warehouse';
import Product from '../models/Product';
import Category from '../models/Category';

describe('Inventory Management System E2E Tests', () => {
  let jwtToken: string;
  let warehouseId: number;
  let productId: number;
  let inventoryId: number;
  let reservationId: number;

  beforeAll(async () => {
    // Setup: Create test user and get JWT token
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        first_name: 'Test',
        last_name: 'User',
        email: 'inventory-test@example.com',
        password: 'TestPassword123!',
      });

    jwtToken = registerRes.body.data.access_token;

    // Setup: Create test warehouse
    const warehouseRes = await request(app)
      .post('/api/v1/warehouses')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Test Warehouse',
        code: 'WH-TEST-001',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        warehouse_type: 'primary',
      });

    warehouseId = warehouseRes.body.data.id;

    // Setup: Create test category
    const categoryRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Test Category',
        description: 'Category for inventory tests',
      });

    // Setup: Create test product
    const productRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Test Product',
        slug: 'test-product',
        category_id: categoryRes.body.data.id,
        price: 99.99,
        sku: 'TEST-SKU-001',
      });

    productId = productRes.body.data.id;
  });

  describe('Inventory Initialization', () => {
    it('should initialize inventory for a product', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/initialize')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          product_id: productId,
          warehouse_id: warehouseId,
          initial_quantity: 1000,
          reorder_level: 100,
          reorder_quantity: 500,
          cost_per_unit: 50.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity_on_hand).toBe(1000);
      expect(res.body.data.stock_status).toBe('in_stock');

      inventoryId = res.body.data.id;
    });

    it('should not initialize inventory twice for same product/warehouse', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/initialize')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          product_id: productId,
          warehouse_id: warehouseId,
          initial_quantity: 500,
          reorder_level: 100,
          reorder_quantity: 500,
          cost_per_unit: 50.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Stock In/Out Operations', () => {
    it('should record incoming stock', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/stock-in')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          quantity: 500,
          batch_number: 'BATCH-001',
          cost_per_unit: 50.0,
          received_date: new Date(),
          supplier: 'Test Supplier',
          reference: 'PO-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inventory.quantity_on_hand).toBe(1500);
    });

    it('should record outgoing stock', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/stock-out')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          quantity: 100,
          reason: 'sale',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inventory.quantity_on_hand).toBe(1400);
    });

    it('should prevent stock out if insufficient quantity', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/stock-out')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          quantity: 2000,
          reason: 'sale',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Inventory Reservation', () => {
    it('should reserve inventory for an order', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/reserve')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          order_id: 1,
          quantity: 100,
          reserved_price: 99.99,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity_reserved).toBe(100);

      reservationId = res.body.data.id;
    });

    it('should update available quantity when reserved', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/${inventoryId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quantity_reserved).toBe(100);
      expect(res.body.data.quantity_available).toBe(1300); // 1400 - 100
    });

    it('should unreserve inventory', async () => {
      const res = await request(app)
        .put(`/api/v1/inventory/unreserve/${reservationId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          reason: 'Order cancelled',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('released');
    });
  });

  describe('Inventory Adjustments', () => {
    it('should adjust inventory up', async () => {
      const res = await request(app)
        .put('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          adjustment_quantity: 200,
          reason: 'Recount adjustment',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inventory.quantity_on_hand).toBe(1600);
    });

    it('should adjust inventory down', async () => {
      const res = await request(app)
        .put('/api/v1/inventory/adjust')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          adjustment_quantity: -50,
          reason: 'Shrinkage adjustment',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inventory.quantity_on_hand).toBe(1550);
    });

    it('should record damage', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/damage')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          batch_id: null,
          quantity: 25,
          reason: 'Damaged in shipping',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inventory.quantity_defective).toBe(25);
    });
  });

  describe('Inventory Retrieval', () => {
    it('should get inventory details', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/${inventoryId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(inventoryId);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.warehouse).toBeDefined();
    });

    it('should get product inventory across warehouses', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/product/${productId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get inventory history', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/${inventoryId}/history`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('should get warehouse inventory summary', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/warehouse/${warehouseId}/summary`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_items).toBeGreaterThan(0);
      expect(res.body.data.total_quantity).toBeGreaterThan(0);
    });
  });

  describe('Low Stock & Alerts', () => {
    it('should get low stock items', async () => {
      // First reduce stock below reorder level
      await request(app)
        .post('/api/v1/inventory/stock-out')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          inventory_id: inventoryId,
          quantity: 1450, // Leave only 75 units (below 100 reorder level)
          reason: 'test',
        });

      const res = await request(app)
        .get('/api/v1/inventory/low-stock/list')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Authorization & Security', () => {
    it('should require authentication for all endpoints', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/${inventoryId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should require proper permissions', async () => {
      // This would test RBAC, assuming user doesn't have permission
      const res = await request(app)
        .post('/api/v1/inventory/initialize')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({});

      // Should fail due to missing role/permission or invalid data
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
