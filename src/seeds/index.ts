import { connectDatabase, disconnectDatabase } from '../config/database';
import { connectRedis, disconnectRedis } from '../config/redis';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedDeliveryMethods } from './delivery-methods.seed';
import logger from '../utils/logger';

const runSeeders = async () => {
  try {
    logger.info('🌱 Starting database seeding...\n');

    // Connect to database and Redis
    await connectDatabase();
    await connectRedis();

    // Run seeders in order
    await seedPermissions();
    logger.info('');
    await seedRoles();
    logger.info('');
    await seedDeliveryMethods();

    logger.info('\n✅ All seeders completed successfully!');
    logger.info('📊 Summary:');
    logger.info('  - Permissions: 133 permissions created/updated');
    logger.info('  - Roles: 7 roles created/updated');
    logger.info('  - Role-Permission assignments: Complete');
    logger.info('  - Delivery Methods: 3 methods created/updated');

    // Disconnect
    await disconnectDatabase();
    await disconnectRedis();

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeders
runSeeders();
