'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // This migration is now a no-op since image_type column is created in the initial table creation
    // Migration 20260216000001-create-product-images.js already includes the image_type column
    console.log('Migration 20260216000003: product_images table already includes image_type column');
  },

  async down(queryInterface, Sequelize) {
    // No action needed on rollback
    console.log('Rollback migration 20260216000003: no changes to undo');
  }
};
