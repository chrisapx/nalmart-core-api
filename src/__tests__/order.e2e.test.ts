import request from 'supertest';
import { Sequelize } from 'sequelize-typescript';
import { connectDatabase, sequelize } from '../config/database';
import { testS3Connection } from '../config/aws';
import { connectRedis } from '../config/redis';
import User from '../models/User';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import Product from '../models/Category';

// Initialize test app
import app from '../app';

describe('Order API E2E Tests', () => {
  let server: any;
  let testUser: User;
  let testProduct: Product;

  beforeAll(async () => {
    // Connect to database
    await connectDatabase();
    await testS3Connection();
    await connectRedis();

    // Start server
    server = app.listen(3001);
  });

  afterAll(async () => {
    await sequelize.close();
    server.close();
  });

  beforeEach(async () => {
    // Clear order tables
    await OrderItem.destroy({ where: {}, truncate: true });
    await Order.destroy({ where: {}, truncate: true });

    // Create test user
    testUser = await User.create({
      first_name: 'Test',
      last_name: 'User',
      email: 'test.order@example.com',
      phone: '1234567890',
      password_hash: 'hashed_password',
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Product',
      slug: 'test-product',
      price: 100,
      sku: 'TEST-001',
      is_active: true,
      is_published: true,
    });
  });

  describe('POST /api/v1/orders', () => {
    it('should create a new order', async () => {
      const orderData = {
        items: [
          {
            product_id: testProduct.id,
            quantity: 2,
          },
        ],
        shipping_address: {
          name: 'John Doe',
          address_line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'USA',
        },
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${testUser.id}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('order_number');
      expect(response.body.data).toHaveProperty('total_amount', 220); // 100 * 2 + tax + shipping
    });

    it('should fail with empty items array', async () => {
      const orderData = {
        items: [],
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${testUser.id}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with non-existent product', async () => {
      const orderData = {
        items: [
          {
            product_id: 99999,
            quantity: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${testUser.id}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    let testOrder: Order;

    beforeEach(async () => {
      testOrder = await Order.create({
        order_number: '1234567890',
        user_id: testUser.id,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_status: 'pending',
        subtotal: 200,
        tax_amount: 20,
        shipping_amount: 50,
        discount_amount: 0,
        total_amount: 270,
      });

      await OrderItem.create({
        order_id: testOrder.id,
        product_id: testProduct.id,
        product_name: testProduct.name,
        product_sku: testProduct.sku,
        product_image_url: '',
        quantity: 2,
        unit_price: 100,
        total_price: 200,
      });
    });

    it('should retrieve order by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('order_number', '1234567890');
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/v1/orders/99999')
        .set('Authorization', `Bearer ${testUser.id}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/orders/my-orders', () => {
    it('should retrieve user orders', async () => {
      await Order.create({
        order_number: '1111111111',
        user_id: testUser.id,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_status: 'pending',
        subtotal: 100,
        tax_amount: 10,
        shipping_amount: 50,
        discount_amount: 0,
        total_amount: 160,
      });

      const response = await request(app)
        .get('/api/v1/orders/my-orders')
        .set('Authorization', `Bearer ${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    let testOrder: Order;

    beforeEach(async () => {
      testOrder = await Order.create({
        order_number: '2222222222',
        user_id: testUser.id,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_status: 'pending',
        subtotal: 100,
        tax_amount: 10,
        shipping_amount: 50,
        discount_amount: 0,
        total_amount: 160,
      });
    });

    it('should cancel order', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${testUser.id}`)
        .send({ reason: 'Changed mind' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'cancelled');
    });

    it('should fail to cancel already cancelled order', async () => {
      await testOrder.update({ status: 'cancelled' });

      const response = await request(app)
        .post(`/api/v1/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${testUser.id}`)
        .send({ reason: 'Already cancelled' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/orders/:id/payment', () => {
    let testOrder: Order;

    beforeEach(async () => {
      testOrder = await Order.create({
        order_number: '3333333333',
        user_id: testUser.id,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_status: 'pending',
        subtotal: 100,
        tax_amount: 10,
        shipping_amount: 50,
        discount_amount: 0,
        total_amount: 160,
      });
    });

    it('should record payment', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${testOrder.id}/payment`)
        .set('Authorization', `Bearer ${testUser.id}`)
        .send({
          transaction_id: 'TXN-12345',
          payment_method: 'card',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('payment_status', 'paid');
      expect(response.body.data).toHaveProperty('status', 'confirmed');
    });

    it('should fail without transaction_id', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${testOrder.id}/payment`)
        .set('Authorization', `Bearer ${testUser.id}`)
        .send({ payment_method: 'card' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/orders/:id/ship', () => {
    let testOrder: Order;

    beforeEach(async () => {
      testOrder = await Order.create({
        order_number: '4444444444',
        user_id: testUser.id,
        status: 'confirmed',
        payment_status: 'paid',
        fulfillment_status: 'processing',
        subtotal: 100,
        tax_amount: 10,
        shipping_amount: 50,
        discount_amount: 0,
        total_amount: 160,
      });
    });

    it('should mark order as shipped', async () => {
      const response = await request(app)
        .post(`/api/v1/orders/${testOrder.id}/ship`)
        .set('Authorization', `Bearer ${testUser.id}`)
        .send({
          tracking_number: 'TRACK-123456',
          carrier: 'FedEx',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'shipped');
      expect(response.body.data).toHaveProperty('fulfillment_status', 'shipped');
      expect(response.body.data).toHaveProperty('tracking_number', 'TRACK-123456');
    });
  });
});
