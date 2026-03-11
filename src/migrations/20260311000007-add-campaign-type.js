'use strict';

/**
 * Migration: Add campaign_type column to campaigns table
 * 
 * Adds a campaign type enum to categorize campaigns as flash_sale, discount,
 * free_shipping, bundle, seasonal, or clearance.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('campaigns', 'campaign_type', {
      type: Sequelize.ENUM('flash_sale', 'discount', 'free_shipping', 'bundle', 'seasonal', 'clearance'),
      allowNull: false,
      defaultValue: 'discount',
      comment: 'Type of campaign',
      after: 'priority',
    });

    // Add index for faster filtering by campaign type
    await queryInterface.addIndex('campaigns', ['campaign_type'], {
      name: 'idx_campaigns_campaign_type',
    });

    // Composite index for common query pattern: active campaigns of specific type
    await queryInterface.addIndex('campaigns', ['campaign_type', 'is_active'], {
      name: 'idx_campaigns_type_active',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('campaigns', 'idx_campaigns_type_active');
    await queryInterface.removeIndex('campaigns', 'idx_campaigns_campaign_type');
    await queryInterface.removeColumn('campaigns', 'campaign_type');
  },
};
