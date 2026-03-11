'use strict';

/**
 * Migration: Add Instant Delivery settings to stores
 * 
 * Adds fields for store-specific instant delivery configuration:
 * - instant_base_fee: Base fee for instant delivery
 * - instant_per_km_fee: Per-kilometer fee for instant delivery
 * - instant_delivery_enabled: Whether instant delivery is available for this store
 * 
 * Also renames existing fields for clarity:
 * - per_km_delivery_fees → normal_per_km_fee
 * - base_delivery_fee → normal_base_fee
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('stores');
    
    // Rename existing fields for clarity
    if (tableDescription.per_km_delivery_fees) {
      await queryInterface.renameColumn('stores', 'per_km_delivery_fees', 'normal_per_km_fee');
      console.log('✅ Renamed per_km_delivery_fees to normal_per_km_fee');
    }
    
    if (tableDescription.base_delivery_fee) {
      await queryInterface.renameColumn('stores', 'base_delivery_fee', 'normal_base_fee');
      console.log('✅ Renamed base_delivery_fee to normal_base_fee');
    }
    
    // Add instant delivery fields
    if (!tableDescription.instant_base_fee) {
      await queryInterface.addColumn('stores', 'instant_base_fee', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Base fee for instant delivery in UGX',
      });
      console.log('✅ Added instant_base_fee column');
    }
    
    if (!tableDescription.instant_per_km_fee) {
      await queryInterface.addColumn('stores', 'instant_per_km_fee', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 3000,
        comment: 'UGX fee per kilometer for instant delivery',
      });
      console.log('✅ Added instant_per_km_fee column');
    }
    
    if (!tableDescription.instant_delivery_enabled) {
      await queryInterface.addColumn('stores', 'instant_delivery_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether instant delivery is available for this store',
      });
      console.log('✅ Added instant_delivery_enabled column');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove instant delivery fields
    await queryInterface.removeColumn('stores', 'instant_delivery_enabled');
    await queryInterface.removeColumn('stores', 'instant_per_km_fee');
    await queryInterface.removeColumn('stores', 'instant_base_fee');
    
    // Revert column names
    await queryInterface.renameColumn('stores', 'normal_per_km_fee', 'per_km_delivery_fees');
    await queryInterface.renameColumn('stores', 'normal_base_fee', 'base_delivery_fee');
  },
};
