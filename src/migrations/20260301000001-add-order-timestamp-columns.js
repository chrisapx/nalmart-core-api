'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('orders');

    const columnsToAdd = [
      { name: 'confirmed_at',        type: Sequelize.DATE, after: 'cancelled_at' },
      { name: 'processed_at',        type: Sequelize.DATE, after: 'confirmed_at' },
      { name: 'shipped_at',          type: Sequelize.DATE, after: 'processed_at' },
      { name: 'delivered_at',        type: Sequelize.DATE, after: 'shipped_at' },
      { name: 'cancelled_at',        type: Sequelize.DATE, after: 'updated_at' },
      { name: 'picked_at',           type: Sequelize.DATE, after: 'delivered_at' },
      { name: 'packed_at',           type: Sequelize.DATE, after: 'picked_at' },
      { name: 'in_transit_at',       type: Sequelize.DATE, after: 'packed_at' },
      { name: 'out_for_delivery_at', type: Sequelize.DATE, after: 'in_transit_at' },
    ];

    for (const col of columnsToAdd) {
      if (!tableDescription[col.name]) {
        await queryInterface.addColumn('orders', col.name, {
          type: col.type,
          allowNull: true,
          defaultValue: null,
        });
      }
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('orders');

    const columnsToRemove = [
      'confirmed_at',
      'processed_at',
      'shipped_at',
      'delivered_at',
      'cancelled_at',
      'picked_at',
      'packed_at',
      'in_transit_at',
      'out_for_delivery_at',
    ];

    for (const col of columnsToRemove) {
      if (tableDescription[col]) {
        await queryInterface.removeColumn('orders', col);
      }
    }
  },
};
