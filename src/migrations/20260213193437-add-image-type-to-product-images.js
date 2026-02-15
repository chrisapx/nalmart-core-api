'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add image_type column to product_images table
    await queryInterface.addColumn('product_images', 'image_type', {
      type: Sequelize.ENUM('cover', 'gallery', 'demo'),
      allowNull: false,
      defaultValue: 'gallery',
      comment: 'Type of image: cover (main product image), gallery (additional product images), demo (usage demonstration images)',
      after: 'is_primary',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove image_type column
    await queryInterface.removeColumn('product_images', 'image_type');
  }
};
