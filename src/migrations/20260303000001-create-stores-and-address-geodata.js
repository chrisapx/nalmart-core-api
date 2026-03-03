'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const allTables = await queryInterface.showAllTables();
    const tableSet = new Set(
      (allTables || []).map((t) =>
        typeof t === 'string' ? t.toLowerCase() : String(t?.tableName || '').toLowerCase(),
      ),
    );

    if (!tableSet.has('stores')) {
      await queryInterface.createTable('stores', {
        id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: Sequelize.STRING(150), allowNull: false },
        logo_url: { type: Sequelize.STRING(500), allowNull: true },
        street: { type: Sequelize.STRING(255), allowNull: true },
        city: { type: Sequelize.STRING(120), allowNull: true },
        state: { type: Sequelize.STRING(120), allowNull: true },
        postal_code: { type: Sequelize.STRING(30), allowNull: true },
        country: { type: Sequelize.STRING(120), allowNull: false, defaultValue: 'Uganda' },
        latitude: { type: Sequelize.DECIMAL(10, 6), allowNull: true },
        longitude: { type: Sequelize.DECIMAL(10, 6), allowNull: true },
        per_km_delivery_fees: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1500 },
        base_delivery_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        is_official: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: Sequelize.JSON, allowNull: true },
        created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });

      await queryInterface.addIndex('stores', ['is_active'], { name: 'idx_stores_active' });
      await queryInterface.addIndex('stores', ['is_official'], { name: 'idx_stores_official' });
    }

    if (tableSet.has('delivery_addresses')) {
      const columns = await queryInterface.describeTable('delivery_addresses');
      const addColumnIfMissing = async (name, definition) => {
        if (!columns[name]) {
          await queryInterface.addColumn('delivery_addresses', name, definition);
        }
      };

      await addColumnIfMissing('latitude', { type: Sequelize.DECIMAL(10, 6), allowNull: true });
      await addColumnIfMissing('longitude', { type: Sequelize.DECIMAL(10, 6), allowNull: true });
      await addColumnIfMissing('formatted_address', { type: Sequelize.STRING(500), allowNull: true });
      await addColumnIfMissing('place_id', { type: Sequelize.STRING(255), allowNull: true });
      await addColumnIfMissing('vicinity', { type: Sequelize.STRING(255), allowNull: true });
      await addColumnIfMissing('location_source', { type: Sequelize.STRING(32), allowNull: true, defaultValue: 'manual' });
      await addColumnIfMissing('distance_km_from_store', { type: Sequelize.DECIMAL(10, 3), allowNull: true });
      await addColumnIfMissing('distance_calculated_at', { type: Sequelize.DATE, allowNull: true });

      const existingIndexes = await queryInterface.showIndex('delivery_addresses');
      const hasLatLngIndex = (existingIndexes || []).some((idx) => idx.name === 'idx_delivery_addresses_lat_lng');
      const hasPlaceIdIndex = (existingIndexes || []).some((idx) => idx.name === 'idx_delivery_addresses_place_id');

      if (!hasLatLngIndex) {
        await queryInterface.addIndex('delivery_addresses', ['latitude', 'longitude'], {
          name: 'idx_delivery_addresses_lat_lng',
        });
      }

      if (!hasPlaceIdIndex) {
        await queryInterface.addIndex('delivery_addresses', ['place_id'], {
          name: 'idx_delivery_addresses_place_id',
        });
      }
    }
  },

  async down(queryInterface) {
    const allTables = await queryInterface.showAllTables();
    const tableSet = new Set(
      (allTables || []).map((t) =>
        typeof t === 'string' ? t.toLowerCase() : String(t?.tableName || '').toLowerCase(),
      ),
    );

    if (tableSet.has('delivery_addresses')) {
      const columns = await queryInterface.describeTable('delivery_addresses');
      const maybeRemove = async (name) => {
        if (columns[name]) {
          await queryInterface.removeColumn('delivery_addresses', name);
        }
      };

      await maybeRemove('formatted_address');
      await maybeRemove('place_id');
      await maybeRemove('vicinity');
      await maybeRemove('location_source');
      await maybeRemove('distance_km_from_store');
      await maybeRemove('distance_calculated_at');
    }

    if (tableSet.has('stores')) {
      await queryInterface.dropTable('stores');
    }
  },
};
