import { Sequelize } from 'sequelize-typescript';
import env from './env';
import logger from '../utils/logger';
import User from '../models/User';
import Role from '../models/Role';
import Permission from '../models/Permission';
import UserRole from '../models/UserRole';
import RolePermission from '../models/RolePermission';
import Category from '../models/Category';
import Product from '../models/Product';
import ProductImage from '../models/ProductImage';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';

const sequelize = new Sequelize({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  dialect: 'mysql',
  logging: env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
  models: [
    User,
    Role,
    Permission,
    UserRole,
    RolePermission,
    Category,
    Product,
    ProductImage,
    Order,
    OrderItem,
  ],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');

    if (env.NODE_ENV === 'development') {
      // Sync models in development (do not use in production)
      await sequelize.sync({ alter: false });
      logger.info('✅ Database models synchronized');
    }
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

export default sequelize;
