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
      per_kg_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Additional fee per kg in UGX',
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

    // Insert default categories
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('delivery_categories');
  },
};
