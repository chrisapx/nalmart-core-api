/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create carts table
    await queryInterface.createTable('carts', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
        comment: 'FK to users table',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      total_items: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Total number of items in cart',
      },
      total_price: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false,
        comment: 'Total price of all items',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });

    // Create index for user_id for faster lookups
    await queryInterface.addIndex('carts', ['user_id'], {
      name: 'idx_carts_user_id',
    });

    // Create cart_items table
    await queryInterface.createTable('cart_items', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      cart_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'FK to carts table',
        references: {
          model: 'carts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'FK to products table',
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
        validate: { min: 1 },
        comment: 'Quantity of product in cart',
      },
      unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Price of product at time of adding to cart',
      },
      total_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: 'quantity * unit_price',
      },
      variant_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON object storing variant selections (size, color, etc)',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });

    // Create indexes for cart_id and product_id
    await queryInterface.addIndex('cart_items', ['cart_id'], {
      name: 'idx_cart_items_cart_id',
    });

    await queryInterface.addIndex('cart_items', ['product_id'], {
      name: 'idx_cart_items_product_id',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop cart_items table first (due to FK constraint)
    await queryInterface.dropTable('cart_items');
    // Then drop carts table
    await queryInterface.dropTable('carts');
  },
};
