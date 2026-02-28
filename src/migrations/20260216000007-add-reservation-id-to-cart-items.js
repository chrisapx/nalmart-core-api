'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cart_items', 'reservation_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: 'reserved_inventory', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Inventory reservation held for this cart item',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('cart_items', 'reservation_id');
  },
};
