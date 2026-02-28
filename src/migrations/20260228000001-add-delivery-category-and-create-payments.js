/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Add `category` column to delivery_methods ─────────────────────
    await queryInterface.addColumn('delivery_methods', 'category', {
      type: Sequelize.ENUM('PickUp', 'Door', 'PickUpXpress', 'DoorXpress'),
      allowNull: false,
      defaultValue: 'Door',
      comment: 'Delivery category: PickUp | Door | PickUpXpress | DoorXpress',
      after: 'type',
    });

    // ── 2. Add `zones` JSON column to delivery_methods (zone-based pricing) ─
    await queryInterface.addColumn('delivery_methods', 'zones', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Zone overrides: {"Kampala": 0, "Entebbe": 5000, "_default": 15000}',
      after: 'coverage_areas',
    });

    // ── 3. Create payments table ──────────────────────────────────────────
    await queryInterface.createTable('payments', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'UGX',
      },
      method: {
        type: Sequelize.ENUM(
          'cash_on_delivery',
          'mobile_money_mtn',
          'mobile_money_airtel',
          'card',
          'bank_transfer'
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'processing',
          'confirmed',
          'failed',
          'refunded',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Internal Nalmart payment reference (e.g. NLM-ABC123)',
      },
      provider_ref: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'External gateway / telco transaction ID',
      },
      phone: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'Phone number used for MTN/Airtel MoMo payments',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Extra provider-specific data',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      refunded_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      refund_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      refund_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });

    // Indexes
    await queryInterface.addIndex('payments', ['order_id'],   { name: 'idx_payments_order_id' });
    await queryInterface.addIndex('payments', ['user_id'],    { name: 'idx_payments_user_id' });
    await queryInterface.addIndex('payments', ['status'],     { name: 'idx_payments_status' });
    await queryInterface.addIndex('payments', ['method'],     { name: 'idx_payments_method' });
    await queryInterface.addIndex('payments', ['reference'],  { name: 'idx_payments_reference', unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payments');
    await queryInterface.removeColumn('delivery_methods', 'zones');
    await queryInterface.removeColumn('delivery_methods', 'category');
    await queryInterface.sequelize.query(
      "ALTER TABLE `delivery_methods` DROP INDEX IF EXISTS `idx_payments_reference`"
    );
  },
};
