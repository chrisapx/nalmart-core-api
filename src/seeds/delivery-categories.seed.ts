import DeliveryMethod from '../models/DeliveryMethod';
import logger from '../utils/logger';

/**
 * Seeds the four Nalmart delivery categories:
 *   PickUp | PickUpXpress | Door | DoorXpress
 *
 * Run with:
 *   ts-node -r tsconfig-paths/register src/seeds/delivery-categories.seed.ts
 */
export const seedDeliveryCategories = async () => {
  logger.info('🚚 Seeding delivery categories (v2)...');

  const methods = [
    // ── Self-collection ──────────────────────────────────────────────────────
    {
      name:                    'PickUp – Standard',
      description:             'Collect your order from our nearest pick-up point at no cost. Ready within 24 hours.',
      type:                    'pickup',
      category:                'PickUp',
      base_fee:                0,
      fee_per_kg:              0,
      max_fee:                 null,
      delivery_days:           1,
      free_shipping_threshold: null,
      is_active:               true,
      display_order:           1,
      zones:                   null,
    },
    {
      name:                    'PickUp – Xpress',
      description:             'Priority preparation — your order is ready within 2 hours for collection.',
      type:                    'same_day',
      category:                'PickUpXpress',
      base_fee:                3000,
      fee_per_kg:              0,
      max_fee:                 3000,
      delivery_days:           0,
      free_shipping_threshold: null,
      is_active:               true,
      display_order:           2,
      zones:                   null,
    },
    // ── Door delivery ────────────────────────────────────────────────────────
    {
      name:                    'Door – Standard',
      description:             'Delivered to your door within 1–3 business days across greater Kampala and major towns.',
      type:                    'standard',
      category:                'Door',
      base_fee:                8000,
      fee_per_kg:              500,
      max_fee:                 35000,
      delivery_days:           3,
      free_shipping_threshold: 150000,   // free for orders above UGX 150,000
      is_active:               true,
      display_order:           3,
      // Zone-based surcharges on top of base_fee
      zones: {
        Kampala:    0,       // base only (no surcharge)
        Wakiso:     2000,
        Entebbe:    4000,
        Mukono:     4000,
        Jinja:      8000,
        Mbarara:    12000,
        Gulu:       15000,
        Mbale:      15000,
        Fort_Portal: 18000,
        Lira:       18000,
        _default:   20000,  // any other city
      },
    },
    {
      name:                    'Door – Xpress',
      description:             'Same-day or next-day express delivery straight to your door.',
      type:                    'express',
      category:                'DoorXpress',
      base_fee:                20000,
      fee_per_kg:              1000,
      max_fee:                 60000,
      delivery_days:           1,
      free_shipping_threshold: null,     // no free threshold for Xpress
      is_active:               true,
      display_order:           4,
      zones: {
        Kampala:    0,
        Wakiso:     5000,
        Entebbe:    8000,
        Mukono:     8000,
        Jinja:      15000,
        _default:   25000,
      },
    },
  ] as Array<Record<string, unknown>>;

  let created = 0;
  let skipped = 0;

  for (const method of methods) {
    const [, wasCreated] = await DeliveryMethod.findOrCreate({
      where:    { name: method.name as string },
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

  logger.info(`🚚 Delivery categories seed complete — ${created} created, ${skipped} already existed`);
};

// Allow running directly
if (require.main === module) {
  (async () => {
    const { connectDatabase } = await import('../config/database');
    await connectDatabase();
    await seedDeliveryCategories();
    process.exit(0);
  })();
}
