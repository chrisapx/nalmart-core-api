'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('cart_items', 'is_selected', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this item is selected for checkout',
      after: 'variant_data',
    });

    // Add index for faster filtering of selected items
    await queryInterface.addIndex('cart_items', ['cart_id', 'is_selected'], {
      name: 'idx_cart_items_cart_id_selected',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('cart_items', 'idx_cart_items_cart_id_selected');
    await queryInterface.removeColumn('cart_items', 'is_selected');
  },
};
