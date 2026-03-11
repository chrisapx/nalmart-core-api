'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('delivery_categories', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Category name (e.g., "Kampala City", "Greater Kampala")',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of coverage area',
      },
      base_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Base delivery fee in UGX',
      },
      per_km_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Additional fee per kilometer in UGX',
      },
      estimated_delivery_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Estimated delivery time in days',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this category is currently active',
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    }, {
      comment: 'Delivery fee categories by geographic area',
    });

    // Add indexes
    await queryInterface.addIndex('delivery_categories', ['is_active', 'sort_order'], {
      name: 'idx_delivery_categories_active_sort',
    });

    // Insert default categories: Instant and Normal only
    await queryInterface.bulkInsert('delivery_categories', [
      {
        name: 'Normal Delivery',
        description: 'Standard delivery with per-km fee calculation',
        base_fee: 0,
        per_km_fee: 0,
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
        per_km_fee: 0,
        estimated_delivery_days: 0,
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('delivery_categories');
  },
};
