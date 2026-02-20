'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_videos', {
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
        comment: 'S3 URL or external video URL (YouTube, Vimeo, etc.)',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      thumbnail_url: {
        type: Sequelize.STRING(1000),
        allowNull: true,
        comment: 'Thumbnail/preview image URL',
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Video duration in seconds',
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes (for uploaded videos)',
      },
      mime_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      video_type: {
        type: Sequelize.ENUM('demo', 'tutorial', 'review', 'unboxing'),
        allowNull: false,
        defaultValue: 'demo',
        comment: 'Type of video content',
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      platform: {
        type: Sequelize.ENUM('local', 'youtube', 'vimeo', 'external'),
        allowNull: false,
        defaultValue: 'local',
        comment: 'Source platform of the video',
      },
      external_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'External video ID (for YouTube, Vimeo, etc.)',
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
          fields: ['video_type'],
        },
        {
          fields: ['platform'],
        },
      ],
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_videos');
  },
};
