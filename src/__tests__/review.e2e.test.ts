import request from 'supertest';
import app from '../app';
import { connectDatabase } from '../config/database';
import { sequelize } from '../config/database';
import User from '../models/User';
import Product from '../models/Product';
import Review from '../models/Review';
import logger from '../utils/logger';

describe('Review Management E2E Tests', () => {
  let accessToken: string;
  let adminToken: string;
  let userId: number;
  let adminId: number;
  let productId: number;
  let reviewId: number;

  beforeAll(async () => {
    try {
      await connectDatabase();
    } catch (error) {
      logger.error('Database connection failed:', error);
    }
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  describe('Authentication Setup', () => {
    it('should register a regular user', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        phone: '+1234567890',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('user.id');

      accessToken = response.body.data.access_token;
      userId = response.body.data.user.id;
    });

    it('should register an admin user', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'AdminPass123!',
        phone: '+1234567891',
      });

      expect(response.status).toBe(201);
      adminToken = response.body.data.access_token;
      adminId = response.body.data.user.id;

      // Assign admin role - this would typically be done via admin panel
      const adminUser = await User.findByPk(adminId);
      if (adminUser) {
        adminUser.is_admin = true;
        await adminUser.save();
      }
    });
  });

  describe('Product Setup', () => {
    it('should create a product for reviews', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Product',
          sku: 'TEST-SKU-001',
          description: 'A test product for reviews',
          short_description: 'Test product',
          price: 99.99,
          category_id: 1,
          status: 'active',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      productId = response.body.data.id;
    });
  });

  describe('Review Creation', () => {
    it('should create a review for a product', async () => {
      const response = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 5,
          title: 'Excellent product!',
          comment: 'This product is amazing. Highly recommend!',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.status).toBe('pending');
      reviewId = response.body.data.id;
    });

    it('should fail to create a review with invalid rating', async () => {
      const response = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 6,
          title: 'Invalid rating',
          comment: 'This should fail',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
        });

      expect(response.status).toBe(400);
    });

    it('should fail to create a review without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 4,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Review Retrieval', () => {
    it('should get reviews for a product with stats', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/product/${productId}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.metadata).toHaveProperty('stats');
    });

    it('should get single review by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .expect(200);

      expect(response.body.data.id).toBe(reviewId);
    });

    it('should return 404 for non-existent review', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/99999')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should get user reviews', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/my-reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Review Moderation (Admin)', () => {
    it('should approve a review', async () => {
      const response = await request(app)
        .post(`/api/v1/reviews/${reviewId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approved_by).toBe(adminId);
      expect(response.body.data.approved_at).toBeDefined();
    });

    it('should not allow regular user to approve review', async () => {
      // Create another review to test unauthorized approval
      const reviewResponse = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 3,
          title: 'Average product',
          comment: 'Not bad, not great',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
        });

      const newReviewId = reviewResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/reviews/${newReviewId}/approve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.status).toBe(403);
    });

    it('should reject a review', async () => {
      // Create a review specifically to reject
      const reviewResponse = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 2,
          title: 'Bad review',
          comment: 'Inappropriate content here',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
        });

      const rejectReviewId = reviewResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/reviews/${rejectReviewId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Inappropriate language',
        })
        .expect(200);

      expect(response.body.data.status).toBe('rejected');
    });

    it('should get all reviews with filtering', async () => {
      const response = await request(app)
        .get('/api/v1/reviews?status=approved&limit=10&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.metadata).toHaveProperty('pagination');
    });

    it('should get review statistics', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('approved');
      expect(response.body.data).toHaveProperty('rejected');
      expect(response.body.data).toHaveProperty('avg_rating');
    });
  });

  describe('Review Engagement', () => {
    it('should mark review as helpful', async () => {
      const response = await request(app)
        .post(`/api/v1/reviews/${reviewId}/helpful`)
        .expect(200);

      expect(response.body.data.helpful_count).toBeGreaterThan(0);
    });

    it('should mark review as unhelpful', async () => {
      const response = await request(app)
        .post(`/api/v1/reviews/${reviewId}/unhelpful`)
        .expect(200);

      expect(response.body.data.unhelpful_count).toBeGreaterThan(0);
    });

    it('should track helpful votes correctly', async () => {
      const beforeResponse = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .expect(200);

      const beforeCount = beforeResponse.body.data.helpful_count;

      await request(app).post(`/api/v1/reviews/${reviewId}/helpful`).expect(200);

      const afterResponse = await request(app)
        .get(`/api/v1/reviews/${reviewId}`)
        .expect(200);

      expect(afterResponse.body.data.helpful_count).toBeGreaterThan(beforeCount);
    });
  });

  describe('Review Update', () => {
    it('should update review', async () => {
      const response = await request(app)
        .put(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated title',
          comment: 'Updated comment',
          rating: 4,
        })
        .expect(200);

      expect(response.body.data.title).toBe('Updated title');
      expect(response.body.data.comment).toBe('Updated comment');
      expect(response.body.data.rating).toBe(4);
    });

    it('should fail to update with invalid rating', async () => {
      const response = await request(app)
        .put(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          rating: 10,
        })
        .expect(400);
    });
  });

  describe('Review Deletion', () => {
    it('should delete review (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');
    });

    it('should not allow regular user to delete review', async () => {
      const reviewResponse = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 4,
          title: 'Another review',
          comment: 'Should not be deletable by user',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
        });

      const newReviewId = reviewResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/reviews/${newReviewId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  describe('Review Images', () => {
    it('should create review with images', async () => {
      const response = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 5,
          title: 'Great product with images',
          comment: 'See attached images',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          image_urls: [
            'https://s3.example.com/image1.jpg',
            'https://s3.example.com/image2.jpg',
          ],
        })
        .expect(201);

      expect(response.body.data.image_urls).toHaveLength(2);
    });

    it('should fail with too many images', async () => {
      const response = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          rating: 5,
          title: 'Too many images',
          comment: 'This should fail',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          image_urls: [
            'https://s3.example.com/1.jpg',
            'https://s3.example.com/2.jpg',
            'https://s3.example.com/3.jpg',
            'https://s3.example.com/4.jpg',
            'https://s3.example.com/5.jpg',
            'https://s3.example.com/6.jpg',
          ],
        })
        .expect(400);
    });
  });

  describe('Product Review Stats', () => {
    it('should calculate average rating for product', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/product/${productId}`)
        .expect(200);

      expect(response.body.metadata.stats).toHaveProperty('avg_rating');
      expect(response.body.metadata.stats).toHaveProperty('total_reviews');
      expect(response.body.metadata.stats).toHaveProperty('rating_distribution');
    });

    it('should include star distribution in product reviews', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/product/${productId}`)
        .expect(200);

      const distribution = response.body.metadata.stats.rating_distribution;
      expect(distribution).toHaveProperty('1_star');
      expect(distribution).toHaveProperty('2_star');
      expect(distribution).toHaveProperty('3_star');
      expect(distribution).toHaveProperty('4_star');
      expect(distribution).toHaveProperty('5_star');
    });
  });
});
