import DeliveryMethod from '../models/DeliveryMethod';
import logger from '../utils/logger';

export const seedDeliveryMethods = async () => {
  logger.info('🚚 Seeding delivery methods...');

  const methods = [
    {
      name: 'Standard Delivery',
      description: 'Delivered within 3–5 business days',
      type: 'standard',
      base_fee: 5000,
      fee_per_kg: 500,
      max_fee: 20000,
      delivery_days: 4,
      free_shipping_threshold: 100000,
      is_active: true,
      display_order: 1,
    },
    {
      name: 'Express Delivery',
      description: 'Delivered within 1–2 business days',
      type: 'express',
      base_fee: 15000,
      fee_per_kg: 1000,
      max_fee: 50000,
      delivery_days: 1,
      free_shipping_threshold: null,
      is_active: true,
      display_order: 2,
    },
    {
      name: 'Pickup',
      description: 'Collect from our nearest pickup point',
      type: 'pickup',
      base_fee: 0,
      fee_per_kg: 0,
      max_fee: null,
      delivery_days: 0,
      free_shipping_threshold: null,
      is_active: true,
      display_order: 3,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const method of methods) {
    const [, wasCreated] = await DeliveryMethod.findOrCreate({
      where: { name: method.name },
      defaults: method,
    });
    if (wasCreated) {
      created++;
      logger.info(`  ✅ Created: ${method.name}`);
    } else {
      skipped++;
      logger.info(`  ⏭️  Exists:  ${method.name}`);
    }
  }

  logger.info(`🚚 Delivery methods seeding complete — created: ${created}, skipped: ${skipped}`);
};
