'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make order_id nullable (carts don't have an order yet)
    await queryInterface.changeColumn('reserved_inventory', 'order_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    });

    // Add cart_id for cart-stage reservations
    await queryInterface.addColumn('reserved_inventory', 'cart_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: 'carts', key: 'id' },
      onDelete: 'CASCADE',
      after: 'order_id',
    });

    // Add reservation_type to distinguish cart vs order reservations
    await queryInterface.addColumn('reserved_inventory', 'reservation_type', {
      type: Sequelize.ENUM('order', 'cart'),
      defaultValue: 'order',
      allowNull: false,
      after: 'cart_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('reserved_inventory', 'reservation_type');
    await queryInterface.removeColumn('reserved_inventory', 'cart_id');
    await queryInterface.changeColumn('reserved_inventory', 'order_id', {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    });
  },
};
