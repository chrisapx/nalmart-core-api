'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // ── warehouse_jobs ────────────────────────────────────────────────────────
    if (!tables.includes('warehouse_jobs')) {
      await queryInterface.createTable('warehouse_jobs', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        order_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onDelete: 'CASCADE',
        },
        warehouse_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
        stage: {
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
        },
        assigned_picker_id:  { type: Sequelize.BIGINT,   allowNull: true },
        assigned_packer_id:  { type: Sequelize.BIGINT,   allowNull: true },
        assigned_agent_id:   { type: Sequelize.BIGINT,   allowNull: true },
        picking_started_at:  { type: Sequelize.DATE,     allowNull: true },
        picking_completed_at:{ type: Sequelize.DATE,     allowNull: true },
        packing_started_at:  { type: Sequelize.DATE,     allowNull: true },
        packing_completed_at:{ type: Sequelize.DATE,     allowNull: true },
        dispatch_at:         { type: Sequelize.DATE,     allowNull: true },
        delivery_code:       { type: Sequelize.STRING(10), allowNull: true },
        delivery_code_expires_at:   { type: Sequelize.DATE, allowNull: true },
        delivery_code_confirmed_at: { type: Sequelize.DATE, allowNull: true },
        box_label_printed:   { type: Sequelize.BOOLEAN,  allowNull: false, defaultValue: false },
        box_label_printed_at:{ type: Sequelize.DATE,     allowNull: true },
        cash_collected:      { type: Sequelize.BOOLEAN,  allowNull: false, defaultValue: false },
        qa_flagged:          { type: Sequelize.BOOLEAN,  allowNull: false, defaultValue: false },
        qa_notes:            { type: Sequelize.TEXT,     allowNull: true },
        admin_notes:         { type: Sequelize.TEXT,     allowNull: true },
        created_at:          { type: Sequelize.DATE,     allowNull: false },
        updated_at:          { type: Sequelize.DATE,     allowNull: false },
      });
    }

    // ── warehouse_job_items ───────────────────────────────────────────────────
    if (!tables.includes('warehouse_job_items')) {
      await queryInterface.createTable('warehouse_job_items', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        warehouse_job_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'warehouse_jobs', key: 'id' },
          onDelete: 'CASCADE',
        },
        order_item_id:     { type: Sequelize.BIGINT,      allowNull: false },
        product_id:        { type: Sequelize.BIGINT,      allowNull: false },
        product_name:      { type: Sequelize.STRING(255), allowNull: false },
        product_sku:       { type: Sequelize.STRING(100), allowNull: true },
        quantity_expected: { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 1 },
        quantity_picked:   { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 0 },
        quantity_packed:   { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 0 },
        pick_status: {
          type: Sequelize.ENUM('pending', 'picked', 'missing', 'damaged'),
          allowNull: false,
          defaultValue: 'pending',
        },
        pack_status: {
          type: Sequelize.ENUM('pending', 'packed', 'missing', 'flagged'),
          allowNull: false,
          defaultValue: 'pending',
        },
        pick_notes:  { type: Sequelize.TEXT,   allowNull: true },
        pack_notes:  { type: Sequelize.TEXT,   allowNull: true },
        picked_by:   { type: Sequelize.BIGINT, allowNull: true },
        packed_by:   { type: Sequelize.BIGINT, allowNull: true },
        picked_at:   { type: Sequelize.DATE,   allowNull: true },
        packed_at:   { type: Sequelize.DATE,   allowNull: true },
        created_at:  { type: Sequelize.DATE,   allowNull: false },
        updated_at:  { type: Sequelize.DATE,   allowNull: false },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('warehouse_job_items', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('warehouse_jobs',      { cascade: true }).catch(() => {});
  },
};
