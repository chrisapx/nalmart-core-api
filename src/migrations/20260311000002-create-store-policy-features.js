'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('store_policy_features', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      store_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Store ID if feature is store-specific, null for global features',
        references: {
          model: 'stores',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('buyer_protection', 'returns', 'delivery', 'payment', 'support', 'warranty', 'insurance', 'guarantee'),
        allowNull: false,
        comment: 'Type of feature',
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Feature title displayed to users',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Feature description',
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Icon name (e.g., "Shield", "RefreshCw", "Truck")',
      },
      value: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Value or detail of the feature (e.g., "30 Day Returns", "24/7")',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this feature is currently active/enabled',
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order (lower numbers appear first)',
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
      comment: 'Store policy features displayed to users (e.g., buyer protection, returns policy)',
    });

    // Add indexes
    await queryInterface.addIndex('store_policy_features', ['store_id'], {
      name: 'idx_store_policy_features_store_id',
    });

    await queryInterface.addIndex('store_policy_features', ['is_active', 'sort_order'], {
      name: 'idx_store_policy_features_active_sort',
    });

    // Insert default global features
    await queryInterface.bulkInsert('store_policy_features', [
      {
        store_id: null,
        type: 'buyer_protection',
        title: 'Buyer Protection',
        description: 'Your purchase is protected against fraud and misrepresentation',
        icon: 'Shield',
        value: 'Protected',
        is_active: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        store_id: null,
        type: 'returns',
        title: 'Easy Returns',
        description: '30-day hassle-free return policy on eligible items',
        icon: 'RefreshCw',
        value: '30 Days',
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        store_id: null,
        type: 'delivery',
        title: 'Fast Delivery',
        description: 'Quick and reliable delivery to your doorstep',
        icon: 'Truck',
        value: '2-48 Hours',
        is_active: true,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        store_id: null,
        type: 'payment',
        title: 'Secure Payment',
        description: 'Your payment information is encrypted and secure',
        icon: 'CreditCard',
        value: 'SSL Encrypted',
        is_active: true,
        sort_order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        store_id: null,
        type: 'support',
        title: 'Customer Support',
        description: 'Our team is available to help you anytime',
        icon: 'Headphones',
        value: '24/7',
        is_active: true,
        sort_order: 5,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('store_policy_features');
  },
};
