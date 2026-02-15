import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import env from './config/env';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { testS3Connection } from './config/aws';
import './config/passport'; // Initialize Passport strategies
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import uploadRoutes from './routes/upload.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import inventoryRoutes from './routes/inventory.routes';
import orderRoutes from './routes/order.routes';
import reviewRoutes from './routes/review.routes';
import deliveryRoutes from './routes/delivery.routes';
import favoriteRoutes from './routes/favorite.routes';
import campaignRoutes from './routes/campaign.routes';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Nalmart Core API is running',
    version: env.API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use(`/api/${env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${env.API_VERSION}/users`, userRoutes);
app.use(`/api/${env.API_VERSION}/upload`, uploadRoutes);
app.use(`/api/${env.API_VERSION}/products`, productRoutes);
app.use(`/api/${env.API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${env.API_VERSION}/inventory`, inventoryRoutes);
app.use(`/api/${env.API_VERSION}/orders`, orderRoutes);
app.use(`/api/${env.API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${env.API_VERSION}/deliveries`, deliveryRoutes);
app.use(`/api/${env.API_VERSION}/favorites`, favoriteRoutes);
app.use(`/api/${env.API_VERSION}/campaigns`, campaignRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize connections and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    if(env.REDIS_ENABLED === 'true'){
      await connectRedis();
    }

    // Test S3 connection
    await testS3Connection();

    // Start server
    const PORT = env.PORT;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📍 API Base URL: http://localhost:${PORT}/api/${env.API_VERSION}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
