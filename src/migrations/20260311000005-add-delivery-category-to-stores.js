'use strict';

/**
 * Migration: Add delivery_category_id to stores table
 * 
 * This allows stores to specify a default delivery category (from delivery_categories table),
 * which determines base fees, per-kg rates, and estimated delivery times.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stores', 'delivery_category_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Default delivery category for this store',
      after: 'base_delivery_fee',
    });

    // Add foreign key constraint referencing delivery_categories
    await queryInterface.addConstraint('stores', {
      fields: ['delivery_category_id'],
      type: 'foreign key',
      name: 'fk_stores_delivery_category',
      references: {
        table: 'delivery_categories',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add index for faster lookups
    await queryInterface.addIndex('stores', ['delivery_category_id'], {
      name: 'idx_stores_delivery_category',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('stores', 'idx_stores_delivery_category');
    await queryInterface.removeConstraint('stores', 'fk_stores_delivery_category');
    await queryInterface.removeColumn('stores', 'delivery_category_id');
  },
};
