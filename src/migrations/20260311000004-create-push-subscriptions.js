'use strict';

/**
 * Migration: Create push_subscriptions table for Web Push notifications
 * 
 * This table stores subscription endpoints for both client and admin users,
 * enabling real-time push notifications for order updates and alerts.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('push_subscriptions', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'NULL for unauthenticated/guest subscriptions',
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'client',
        comment: 'client = customer notifications, admin = order alerts',
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Web Push subscription endpoint URL',
      },
      p256dh: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'base64url encoded p256dh public key',
      },
      auth: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'base64url encoded auth secret',
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'User-agent string for debugging/deduplication',
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
    });

    // Index for user lookups
    await queryInterface.addIndex('push_subscriptions', ['user_id'], {
      name: 'idx_push_subscriptions_user_id',
    });

    // Index for role-based queries (e.g., "notify all admins")
    await queryInterface.addIndex('push_subscriptions', ['role'], {
      name: 'idx_push_subscriptions_role',
    });

    // Composite index for user+role queries
    await queryInterface.addIndex('push_subscriptions', ['user_id', 'role'], {
      name: 'idx_push_subscriptions_user_role',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('push_subscriptions');
  },
};
