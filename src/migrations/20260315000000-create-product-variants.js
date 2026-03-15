'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_variants', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Unique SKU for this variant',
      },
      variant_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Variant name/label (e.g., "Red - Large")',
      },
      attributes: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Variant attributes as key-value pairs',
      },
      price_adjustment: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Price adjustment from base product price',
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Stock quantity for this specific variant',
      },
      image_url: {
        type: Sequelize.STRING(1000),
        allowNull: true,
        comment: 'Variant-specific image URL',
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this variant is available for purchase',
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order for this variant',
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Weight in kg (optional)',
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Dimensions in cm: {length, width, height}',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('product_variants', ['product_id']);
    await queryInterface.addIndex('product_variants', ['sku']);
    await queryInterface.addIndex('product_variants', ['is_available']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_variants');
  },
};
