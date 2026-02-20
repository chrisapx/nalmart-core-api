'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_images', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      url: {
        type: Sequelize.STRING(1000),
        allowNull: false,
        comment: 'S3 URL - no file storage, URLs only',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      alt_text: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes',
      },
      mime_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      image_type: {
        type: Sequelize.ENUM('cover', 'gallery', 'demo'),
        allowNull: false,
        defaultValue: 'gallery',
        comment: 'Type of image: cover (main product image), gallery (additional product images), demo (usage demonstration images)',
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Image width in pixels',
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Image height in pixels',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      indexes: [
        {
          fields: ['product_id'],
        },
        {
          fields: ['is_primary'],
        },
        {
          fields: ['image_type'],
        },
      ],
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_images');
  },
};
