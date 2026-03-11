'use strict';

/**
 * Migration: Ensure per_km_fee column exists in delivery_categories
 * 
 * This migration safely adds the per_km_fee column if it doesn't exist.
 * This handles cases where the table was created before this field was added.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('delivery_categories');
    
    // Check if per_km_fee column exists
    if (!tableDescription.per_km_fee) {
      console.log('Adding per_km_fee column to delivery_categories...');
      await queryInterface.addColumn('delivery_categories', 'per_km_fee', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Additional fee per kilometer in UGX',
      });
      console.log('✅ per_km_fee column added successfully');
    } else {
      console.log('✅ per_km_fee column already exists');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('delivery_categories', 'per_km_fee');
  },
};
