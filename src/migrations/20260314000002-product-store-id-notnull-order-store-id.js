'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. products.store_id: backfill NULLs, then make NOT NULL DEFAULT 1 ──
    const [productCols] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'products'
         AND COLUMN_NAME  = 'store_id'`
    );

    if (productCols.length > 0) {
      // Fill any existing NULLs first so the NOT NULL constraint won't fail
      await queryInterface.sequelize.query(
        `UPDATE products SET store_id = 1 WHERE store_id IS NULL`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE products
         MODIFY COLUMN store_id BIGINT NOT NULL DEFAULT 1
         COMMENT 'Which store this product belongs to; defaults to official store (id=1)'`
      );
    }

    // ── 2. orders.store_id: add if missing, default 1 ────────────────────────
    const [orderCols] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'orders'
         AND COLUMN_NAME  = 'store_id'`
    );

    if (orderCols.length === 0) {
      await queryInterface.addColumn('orders', 'store_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Store this order belongs to; 1 = official store when products are mixed',
        after: 'user_id',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert orders.store_id
    const [orderCols] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'orders'
         AND COLUMN_NAME  = 'store_id'`
    );
    if (orderCols.length > 0) {
      await queryInterface.removeColumn('orders', 'store_id');
    }

    // Revert products.store_id back to nullable (no DEFAULT)
    const [productCols] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'products'
         AND COLUMN_NAME  = 'store_id'`
    );
    if (productCols.length > 0) {
      await queryInterface.sequelize.query(
        `ALTER TABLE products MODIFY COLUMN store_id BIGINT NULL DEFAULT NULL`
      );
    }
  },
};
