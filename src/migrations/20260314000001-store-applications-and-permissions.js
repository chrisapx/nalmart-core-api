'use strict';

/**
 * Migration: Store Applications + Store-User Permissions Expansion
 *
 * 1. Update store_users.role ENUM to ('owner','manager','staff','viewer')
 * 2. Add store_users columns: permissions, invited_by, invitation_note
 * 3. Add stores.logo_url
 * 4. Create store_applications table
 *
 * All operations are idempotent via INFORMATION_SCHEMA checks.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { QueryTypes } = Sequelize;

    const colExists = async (table, column) => {
      const rows = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME  = '${table}'
           AND COLUMN_NAME = '${column}'
         LIMIT 1`,
        { type: QueryTypes.SELECT }
      );
      return rows.length > 0;
    };

    const tblExists = async (table) => {
      const rows = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME  = '${table}'
         LIMIT 1`,
        { type: QueryTypes.SELECT }
      );
      return rows.length > 0;
    };

    // ── 1. Update role ENUM ───────────────────────────────────────────────────
    await queryInterface.changeColumn('store_users', 'role', {
      type: Sequelize.ENUM('owner', 'manager', 'staff', 'viewer'),
      allowNull: false,
      defaultValue: 'staff',
    });

    // ── 2. Extend store_users ─────────────────────────────────────────────────
    if (!await colExists('store_users', 'permissions')) {
      await queryInterface.addColumn('store_users', 'permissions', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON array of permission slugs; null = use role defaults',
        after: 'role',
      });
    }

    if (!await colExists('store_users', 'invited_by')) {
      await queryInterface.addColumn('store_users', 'invited_by', {
        type: Sequelize.BIGINT,
        allowNull: true,
        after: 'permissions',
      });
    }

    if (!await colExists('store_users', 'invitation_note')) {
      await queryInterface.addColumn('store_users', 'invitation_note', {
        type: Sequelize.STRING(300),
        allowNull: true,
        after: 'invited_by',
      });
    }

    // ── 3. Add logo_url to stores ─────────────────────────────────────────────
    if (!await colExists('stores', 'logo_url')) {
      await queryInterface.addColumn('stores', 'logo_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        after: 'name',
      });
    }

    // ── 4. Create store_applications ──────────────────────────────────────────
    if (!await tblExists('store_applications')) {
      await queryInterface.createTable('store_applications', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        applicant_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        store_name: { type: Sequelize.STRING(150), allowNull: false },
        description: { type: Sequelize.STRING(500), allowNull: true },
        email:        { type: Sequelize.STRING(150), allowNull: true },
        phone:        { type: Sequelize.STRING(30),  allowNull: true },
        business_type:{ type: Sequelize.STRING(100), allowNull: true },
        website_url:  { type: Sequelize.STRING(200), allowNull: true },
        logo_url:     { type: Sequelize.STRING(200), allowNull: true },
        metadata:     { type: Sequelize.JSON,        allowNull: true },
        status: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected', 'under_review'),
          allowNull: false,
          defaultValue: 'pending',
        },
        reviewed_by: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        },
        review_notes: { type: Sequelize.TEXT, allowNull: true },
        reviewed_at:  { type: Sequelize.DATE, allowNull: true },
        store_id:     { type: Sequelize.BIGINT, allowNull: true },
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

      await queryInterface.addIndex('store_applications', ['applicant_id'], { name: 'idx_store_applications_applicant_id' });
      await queryInterface.addIndex('store_applications', ['status'],       { name: 'idx_store_applications_status'       });
      await queryInterface.addIndex('store_applications', ['reviewed_by'],  { name: 'idx_store_applications_reviewed_by'  });
      await queryInterface.addIndex('store_applications', ['store_id'],     { name: 'idx_store_applications_store_id'     });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('store_applications').catch(() => {});
    await queryInterface.removeColumn('stores', 'logo_url').catch(() => {});
    await queryInterface.removeColumn('store_users', 'invitation_note').catch(() => {});
    await queryInterface.removeColumn('store_users', 'invited_by').catch(() => {});
    await queryInterface.removeColumn('store_users', 'permissions').catch(() => {});
    await queryInterface.changeColumn('store_users', 'role', {
      type: Sequelize.ENUM('owner', 'manager', 'vendor'),
      allowNull: false,
      defaultValue: 'vendor',
    });
  },
};
