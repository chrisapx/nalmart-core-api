'use strict';

/**
 * Migration: Vendor & Audit Trail Foundation
 *
 * 1. Add store_id / created_by / updated_by to products  (product ↔ store/user ownership)
 * 2. Add email / phone / description to stores            (vendor contact details)
 * 3. Create store_users                                   (vendor membership join table)
 * 4. Create product_audit_logs                            (full audit trail on every product change)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── 1. Extend products ────────────────────────────────────────────────────
    await queryInterface.addColumn('products', 'store_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Which store this product belongs to (null = Nalmart official)',
      after: 'category_id',
    });

    await queryInterface.addColumn('products', 'created_by', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'User who first created this product',
      after: 'store_id',
    });

    await queryInterface.addColumn('products', 'updated_by', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'User who last updated this product',
      after: 'created_by',
    });

    await queryInterface.addIndex('products', ['store_id'], {
      name: 'idx_products_store_id',
    });

    await queryInterface.addIndex('products', ['created_by'], {
      name: 'idx_products_created_by',
    });

    // ── 2. Extend stores with contact/vendor info ─────────────────────────────
    await queryInterface.addColumn('stores', 'email', {
      type: Sequelize.STRING(150),
      allowNull: true,
      comment: 'Store contact email',
      after: 'is_official',
    });

    await queryInterface.addColumn('stores', 'phone', {
      type: Sequelize.STRING(30),
      allowNull: true,
      comment: 'Store contact phone number',
      after: 'email',
    });

    await queryInterface.addColumn('stores', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Short description of the store / vendor',
      after: 'phone',
    });

    // ── 3. Create store_users (vendor membership) ─────────────────────────────
    await queryInterface.createTable('store_users', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      store_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'stores', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('owner', 'manager', 'vendor'),
        allowNull: false,
        defaultValue: 'vendor',
        comment: 'owner = full control, manager = edit, vendor = read + limited edit',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('store_users', ['store_id'], { name: 'idx_store_users_store_id' });
    await queryInterface.addIndex('store_users', ['user_id'],  { name: 'idx_store_users_user_id'  });
    await queryInterface.addIndex('store_users', ['store_id', 'user_id'], {
      name: 'idx_store_users_unique',
      unique: true,
    });

    // ── 4. Create product_audit_logs ───────────────────────────────────────────
    await queryInterface.createTable('product_audit_logs', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
      },
      actor_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'NULL = system action',
      },
      actor_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Snapshot of actor email at time of action',
      },
      actor_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Snapshot of actor full name at time of action',
      },
      action: {
        type: Sequelize.ENUM('create', 'update', 'delete', 'restore', 'publish', 'unpublish'),
        allowNull: false,
      },
      changes: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Field-level diff: { fieldName: { from: old, to: new } }',
      },
      snapshot: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Full product snapshot at time of action',
      },
      ip_address: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('product_audit_logs', ['product_id'], { name: 'idx_pal_product_id'  });
    await queryInterface.addIndex('product_audit_logs', ['actor_id'],   { name: 'idx_pal_actor_id'    });
    await queryInterface.addIndex('product_audit_logs', ['action'],     { name: 'idx_pal_action'       });
    await queryInterface.addIndex('product_audit_logs', ['created_at'], { name: 'idx_pal_created_at'   });
  },

  down: async (queryInterface) => {
    // product_audit_logs
    await queryInterface.dropTable('product_audit_logs');

    // store_users
    await queryInterface.dropTable('store_users');

    // stores extras
    await queryInterface.removeColumn('stores', 'description');
    await queryInterface.removeColumn('stores', 'phone');
    await queryInterface.removeColumn('stores', 'email');

    // products extras
    await queryInterface.removeIndex('products', 'idx_products_created_by');
    await queryInterface.removeIndex('products', 'idx_products_store_id');
    await queryInterface.removeColumn('products', 'updated_by');
    await queryInterface.removeColumn('products', 'created_by');
    await queryInterface.removeColumn('products', 'store_id');
  },
};
