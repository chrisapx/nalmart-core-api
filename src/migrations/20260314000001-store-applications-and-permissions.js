'use strict';

/**
 * Migration: Store Applications + Store-User Permissions Expansion
 *
 * 1. Extend store_users with granular permissions, invited_by, invitation_note
 *    and update the role ENUM to ('owner','manager','staff','viewer')
 * 2. Add logo_url to stores
 * 3. Create store_applications table (vendor store-request workflow)
 *
 * All operations are fully idempotent via INFORMATION_SCHEMA checks.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ── helpers ───────────────────────────────────────────────────────────────
    const columnExists = async (table, column) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = :table
           AND COLUMN_NAME  = :column
         LIMIT 1`,
        { replacements: { table, column }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      return !!rows;
    };

    const tableExists = async (table) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = :table
         LIMIT 1`,
        { replacements: { table }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      return !!rows;
    };

    // ── 1. Extend store_users ─────────────────────────────────────────────────

    await queryInterface.changeColumn('store_users', 'role', {
      type: Sequelize.ENUM('owner', 'manager', 'staff', 'viewer'),
      allowNull: false,
      defaultValue: 'staff',
      comment: 'owner = full control, manager = all ops + staff mgmt, staff = products/orders, viewer = read-only',
    });

    if (!await columnExists('store_users', 'permissions')) {
      await queryInterface.addColumn('store_users', 'permissions', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON array of permission slugs; null means use role defaults',
        after: 'role',
      });
    }

    if (!await columnExists('store_users', 'invited_by')) {
      await queryInterface.addColumn('store_users', 'invited_by', {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        after: 'permissions',
      });
    }

    if (!await columnExists('store_users', 'invitation_note')) {
      await queryInterface.addColumn('store_users', 'invitation_note', {
        type: Sequelize.STRING(300),
        allowNull: true,
        after: 'invited_by',
      });
    }

    // ── 2. Add logo_url to stores ─────────────────────────────────────────────

    if (!await columnExists('stores', 'logo_url')) {
      await queryInterface.addColumn('stores', 'logo_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Store logo image URL',
        after: 'name',
      });
    }

    // ── 3. Create store_applications ─────────────────────────────────────────

    if (!await tableExists('store_applications')) {
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
          comment: 'User submitting the application',
        },
        store_name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        email: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        phone: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        business_type: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        website_url: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        logo_url: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Any additional info supplied by the applicant',
        },
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
          comment: 'Admin who reviewed/acted on the application',
        },
        review_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        reviewed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        store_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: 'Populated when application is approved and store is created',
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

      await queryInterface.addIndex('store_applications', ['applicant_id'], { name: 'idx_store_applications_applicant_id' });
      await queryInterface.addIndex('store_applications', ['status'],       { name: 'idx_store_applications_status' });
      await queryInterface.addIndex('store_applications', ['reviewed_by'],  { name: 'idx_store_applications_reviewed_by' });
      await queryInterface.addIndex('store_applications', ['store_id'],     { name: 'idx_store_applications_store_id' });
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


/**
 * Migration: Store Applications + Store-User Permissions Expansion
 *
 * 1. Extend store_users with granular permissions, invited_by, invitation_note
 *    and update the role ENUM to ('owner','manager','staff','viewer')
 * 2. Add logo_url to stores
 * 3. Create store_applications table (vendor store-request workflow)
 *
 * All column additions are idempotent (skip if already exists).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ── helpers ───────────────────────────────────────────────────────────────
    const hasColumn = async (table, column) => {
      const cols = await queryInterface.describeTable(table);
      return Object.prototype.hasOwnProperty.call(cols, column);
    };

    const hasTable = async (table) => {
      const tables = await queryInterface.showAllTables();
      return tables.includes(table);
    };

    // ── 1. Extend store_users ─────────────────────────────────────────────────

    // Update role ENUM to include 'staff' and 'viewer'.
    await queryInterface.changeColumn('store_users', 'role', {
      type: Sequelize.ENUM('owner', 'manager', 'staff', 'viewer'),
      allowNull: false,
      defaultValue: 'staff',
      comment: 'owner = full control, manager = all ops + staff mgmt, staff = products/orders, viewer = read-only',
    });

    if (!await hasColumn('store_users', 'permissions')) {
      await queryInterface.addColumn('store_users', 'permissions', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON array of permission slugs; null means use role defaults',
        after: 'role',
      });
    }

    if (!await hasColumn('store_users', 'invited_by')) {
      await queryInterface.addColumn('store_users', 'invited_by', {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        after: 'permissions',
      });
    }

    if (!await hasColumn('store_users', 'invitation_note')) {
      await queryInterface.addColumn('store_users', 'invitation_note', {
        type: Sequelize.STRING(300),
        allowNull: true,
        after: 'invited_by',
      });
    }

    // ── 2. Add logo_url to stores ─────────────────────────────────────────────

    if (!await hasColumn('stores', 'logo_url')) {
      await queryInterface.addColumn('stores', 'logo_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Store logo image URL',
        after: 'name',
      });
    }

    // ── 3. Create store_applications ─────────────────────────────────────────

    if (!await hasTable('store_applications')) {
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
          comment: 'User submitting the application',
        },
        store_name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        email: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        phone: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        business_type: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        website_url: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        logo_url: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Any additional info supplied by the applicant',
        },
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
          comment: 'Admin who reviewed/acted on the application',
        },
        review_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        reviewed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        store_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: 'Populated when application is approved and store is created',
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

      await queryInterface.addIndex('store_applications', ['applicant_id'], { name: 'idx_store_applications_applicant_id' });
      await queryInterface.addIndex('store_applications', ['status'],       { name: 'idx_store_applications_status' });
      await queryInterface.addIndex('store_applications', ['reviewed_by'],  { name: 'idx_store_applications_reviewed_by' });
      await queryInterface.addIndex('store_applications', ['store_id'],     { name: 'idx_store_applications_store_id' });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse in opposite order

    // 3.
    await queryInterface.dropTable('store_applications').catch(() => {});

    // 2.
    await queryInterface.removeColumn('stores', 'logo_url').catch(() => {});

    // 1.
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
        comment: 'User submitting the application',
      },

      store_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },

      email: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      phone: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },

      business_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      website_url: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },

      logo_url: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },

      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Any additional info supplied by the applicant',
      },

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
        comment: 'Admin who reviewed/acted on the application',
      },

      review_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      store_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Populated when application is approved and store is created',
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

    // Indexes for common query patterns
    await queryInterface.addIndex('store_applications', ['applicant_id'],   { name: 'idx_store_applications_applicant_id' });
    await queryInterface.addIndex('store_applications', ['status'],          { name: 'idx_store_applications_status' });
    await queryInterface.addIndex('store_applications', ['reviewed_by'],     { name: 'idx_store_applications_reviewed_by' });
    await queryInterface.addIndex('store_applications', ['store_id'],        { name: 'idx_store_applications_store_id' });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse in opposite order

    // 3. Drop store_applications
    await queryInterface.dropTable('store_applications');

    // 2. Remove logo_url from stores
    await queryInterface.removeColumn('stores', 'logo_url');

    // 1. Reverse store_users changes
    await queryInterface.removeColumn('store_users', 'invitation_note');
    await queryInterface.removeColumn('store_users', 'invited_by');
    await queryInterface.removeColumn('store_users', 'permissions');
    await queryInterface.changeColumn('store_users', 'role', {
      type: Sequelize.ENUM('owner', 'manager', 'vendor'),
      allowNull: false,
      defaultValue: 'vendor',
    });
  },
};
