'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_items', 'variant_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Variant ID if a specific variant was ordered',
      references: {
        model: 'product_variants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('order_items', 'variant_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Snapshot of variant name at time of order',
    });

    await queryInterface.addColumn('order_items', 'variant_attributes', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Snapshot of variant attributes at time of order',
    });

    // Add index for better query performance
    await queryInterface.addIndex('order_items', ['variant_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_items', 'variant_attributes');
    await queryInterface.removeColumn('order_items', 'variant_name');
    await queryInterface.removeColumn('order_items', 'variant_id');
  },
};
