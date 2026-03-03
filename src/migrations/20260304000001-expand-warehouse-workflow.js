'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableSet = new Set(tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.toString())));

    if (tableSet.has('warehouse_jobs')) {
      const columns = await queryInterface.describeTable('warehouse_jobs');

      if (columns.stage) {
        await queryInterface.changeColumn('warehouse_jobs', 'stage', {
          type: Sequelize.ENUM(
            'pending_pick',
            'processing',
            'picking',
            'shipping',
            'packing',
            'qa',
            'open_for_delivery',
            'out_for_delivery',
            'delivered',
            'cancelled'
          ),
          allowNull: false,
          defaultValue: 'pending_pick',
        });
      }

      const addJobCol = async (name, definition) => {
        if (!columns[name]) {
          await queryInterface.addColumn('warehouse_jobs', name, definition);
        }
      };

      await addJobCol('assigned_shipper_id', { type: Sequelize.BIGINT, allowNull: true });
      await addJobCol('assigned_qa_id', { type: Sequelize.BIGINT, allowNull: true });
      await addJobCol('selected_for_processing_by', { type: Sequelize.BIGINT, allowNull: true });
      await addJobCol('selected_for_processing_at', { type: Sequelize.DATE, allowNull: true });
      await addJobCol('shipping_started_at', { type: Sequelize.DATE, allowNull: true });
      await addJobCol('shipping_completed_at', { type: Sequelize.DATE, allowNull: true });
      await addJobCol('qa_started_at', { type: Sequelize.DATE, allowNull: true });
      await addJobCol('qa_completed_at', { type: Sequelize.DATE, allowNull: true });
      await addJobCol('open_for_delivery_at', { type: Sequelize.DATE, allowNull: true });
      await addJobCol('out_for_delivery_at', { type: Sequelize.DATE, allowNull: true });
      await addJobCol('sealed_at', { type: Sequelize.DATE, allowNull: true });
    }

    if (tableSet.has('warehouse_job_items')) {
      const columns = await queryInterface.describeTable('warehouse_job_items');

      const addItemCol = async (name, definition) => {
        if (!columns[name]) {
          await queryInterface.addColumn('warehouse_job_items', name, definition);
        }
      };

      await addItemCol('quantity_shipped', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
      await addItemCol('shipping_status', {
        type: Sequelize.ENUM('pending', 'checked', 'missing', 'flagged'),
        allowNull: false,
        defaultValue: 'pending',
      });
      await addItemCol('shipping_notes', { type: Sequelize.TEXT, allowNull: true });
      await addItemCol('shipped_by', { type: Sequelize.BIGINT, allowNull: true });
      await addItemCol('shipped_at', { type: Sequelize.DATE, allowNull: true });
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableSet = new Set(tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.toString())));

    if (tableSet.has('warehouse_job_items')) {
      const columns = await queryInterface.describeTable('warehouse_job_items');
      const itemCols = ['quantity_shipped', 'shipping_status', 'shipping_notes', 'shipped_by', 'shipped_at'];
      for (const name of itemCols) {
        if (columns[name]) {
          await queryInterface.removeColumn('warehouse_job_items', name);
        }
      }
    }

    if (tableSet.has('warehouse_jobs')) {
      const columns = await queryInterface.describeTable('warehouse_jobs');
      const jobCols = [
        'assigned_shipper_id',
        'assigned_qa_id',
        'selected_for_processing_by',
        'selected_for_processing_at',
        'shipping_started_at',
        'shipping_completed_at',
        'qa_started_at',
        'qa_completed_at',
        'open_for_delivery_at',
        'out_for_delivery_at',
        'sealed_at',
      ];

      for (const name of jobCols) {
        if (columns[name]) {
          await queryInterface.removeColumn('warehouse_jobs', name);
        }
      }

      if (columns.stage) {
        await queryInterface.changeColumn('warehouse_jobs', 'stage', {
          type: Sequelize.ENUM(
            'pending_pick',
            'picking',
            'packing',
            'ready_for_dispatch',
            'out_for_delivery',
            'delivered',
            'cancelled'
          ),
          allowNull: false,
          defaultValue: 'pending_pick',
        });
      }
    }
  },
};
