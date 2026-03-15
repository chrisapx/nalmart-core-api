'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'specifications', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Product specifications as key-value pairs',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'specifications');
  },
};
