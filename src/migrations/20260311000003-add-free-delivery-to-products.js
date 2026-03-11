'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add free_delivery column
    await queryInterface.addColumn('products', 'free_delivery', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Admin-controlled flag for free delivery eligibility',
    });

    // Add index for better query performance
    await queryInterface.addIndex('products', ['free_delivery'], {
      name: 'idx_products_free_delivery',
    });
  },

  down: async (queryInterface) => {
    // Remove index first
    await queryInterface.removeIndex('products', 'idx_products_free_delivery');
    
    // Remove column
    await queryInterface.removeColumn('products', 'free_delivery');
  },
};
