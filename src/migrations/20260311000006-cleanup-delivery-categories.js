'use strict';

/**
 * Migration: Clean up delivery_categories to match requirements
 * 
 * Removes region-based categories (Kampala City, Greater Kampala, etc.)
 * and ensures only Instant Delivery and Normal Delivery exist.
 */
module.exports = {
  up: async (queryInterface) => {
    // Delete all existing categories
    await queryInterface.bulkDelete('delivery_categories', null, {});

    // Insert the correct categories
    await queryInterface.bulkInsert('delivery_categories', [
      {
        name: 'Normal Delivery',
        description: 'Standard delivery with per-km fee calculation',
        base_fee: 0,
        per_kg_fee: 0,
        estimated_delivery_days: 2,
        is_active: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Instant Delivery',
        description: 'Express delivery with higher per-km fee',
        base_fee: 0,
        per_kg_fee: 0,
        estimated_delivery_days: 0,
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    // Rollback: restore the old categories
    await queryInterface.bulkDelete('delivery_categories', null, {});

    await queryInterface.bulkInsert('delivery_categories', [
      {
        name: 'Kampala City',
        description: 'Within Kampala city limits',
        base_fee: 5000,
        per_kg_fee: 1000,
        estimated_delivery_days: 1,
        is_active: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Greater Kampala',
        description: 'Greater Kampala metropolitan area (Entebbe, Wakiso, Mukono)',
        base_fee: 10000,
        per_kg_fee: 2000,
        estimated_delivery_days: 2,
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Central Region',
        description: 'Central region outside Greater Kampala',
        base_fee: 20000,
        per_kg_fee: 3000,
        estimated_delivery_days: 3,
        is_active: true,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Upcountry',
        description: 'Outside Central region',
        base_fee: 35000,
        per_kg_fee: 5000,
        estimated_delivery_days: 5,
        is_active: true,
        sort_order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
};
