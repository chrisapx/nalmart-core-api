import { Op } from 'sequelize';
import Inventory from '../models/Inventory';
import InventoryBatch from '../models/InventoryBatch';
import InventoryHistory from '../models/InventoryHistory';
import InventoryAlert from '../models/InventoryAlert';
import ReservedInventory from '../models/ReservedInventory';
import Warehouse from '../models/Warehouse';
import Product from '../models/Product';
import User from '../models/User';
import logger from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';

export class InventoryService {
  /**
   * Initialize inventory for a product in a warehouse
   */
  static async initializeInventory(
    product_id: number,
    warehouse_id: number,
    initial_quantity: number,
    reorder_level: number = 50,
    reorder_quantity: number = 500,
    cost_per_unit: number = 0
  ): Promise<Inventory> {
    try {
      // Check if inventory already exists
      const existing = await Inventory.findOne({
        where: { product_id, warehouse_id },
      });

      if (existing) {
        throw new ValidationError(`Inventory already exists for this product in warehouse`);
      }

      const inventory = await Inventory.create({
        product_id,
        warehouse_id,
        quantity_on_hand: initial_quantity,
        quantity_reserved: 0,
        quantity_available: initial_quantity,
        quantity_in_transit: 0,
        quantity_defective: 0,
        reorder_level,
        reorder_quantity,
        cost_per_unit,
        stock_status: initial_quantity > reorder_level ? 'in_stock' : 'low_stock',
      });

      // Create history record
      await this.recordInventoryHistory(
        inventory.id,
        warehouse_id,
        null,
        null,
        'initial',
        initial_quantity,
        0,
        initial_quantity,
        cost_per_unit,
        null,
        'Initial inventory setup'
      );

      logger.info(`Inventory initialized for product ${product_id} in warehouse ${warehouse_id}`);
      return inventory;
    } catch (error) {
      logger.error('Error initializing inventory:', error);
      throw error;
    }
  }

  /**
   * Record incoming stock (purchase/receipt)
   */
  static async stockIn(
    inventory_id: number,
    quantity: number,
    batch_number: string,
    cost_per_unit: number,
    received_date: Date = new Date(),
    supplier: string = '',
    reference: string = '',
    metadata: any = {},
    user_id?: number
  ): Promise<{ inventory: Inventory; batch: InventoryBatch; history: InventoryHistory }> {
    try {
      const inventory = await Inventory.findByPk(inventory_id);
      if (!inventory) throw new NotFoundError('Inventory not found');

      // Create batch record
      const batch = await InventoryBatch.create({
        inventory_id,
        batch_number,
        quantity_received: quantity,
        quantity_sold: 0,
        quantity_damaged: 0,
        quantity_remaining: quantity,
        cost_per_unit,
        total_cost: quantity * cost_per_unit,
        received_date,
        supplier,
        reference_number: reference,
        metadata,
      });

      // Update inventory quantities
      const quantity_before = inventory.quantity_on_hand;
      inventory.quantity_on_hand += quantity;
      inventory.quantity_available = inventory.quantity_on_hand - inventory.quantity_reserved;

      // Update stock status
      if (inventory.quantity_on_hand > inventory.reorder_level) {
        inventory.stock_status = 'in_stock';
      }

      await inventory.save();

      // Record history
      const history = await this.recordInventoryHistory(
        inventory_id,
        inventory.warehouse_id,
        batch.id,
        null,
        'stock_in',
        quantity,
        quantity_before,
        inventory.quantity_on_hand,
        cost_per_unit,
        reference,
        `Stock received - Batch ${batch_number}`,
        user_id,
        metadata
      );

      logger.info(`Stocked in ${quantity} units for inventory ${inventory_id} from batch ${batch_number}`);
      return { inventory, batch, history };
    } catch (error) {
      logger.error('Error recording stock in:', error);
      throw error;
    }
  }

  /**
   * Record outgoing stock (sale/shipment)
   */
  static async stockOut(
    inventory_id: number,
    quantity: number,
    reason: string = 'sale',
    order_id?: number,
    user_id?: number,
    metadata: any = {}
  ): Promise<{ inventory: Inventory; history: InventoryHistory }> {
    try {
      const inventory = await Inventory.findByPk(inventory_id);
      if (!inventory) throw new NotFoundError('Inventory not found');

      if (inventory.quantity_available < quantity) {
        throw new ValidationError(`Insufficient available inventory. Available: ${inventory.quantity_available}`);
      }

      const quantity_before = inventory.quantity_on_hand;
      inventory.quantity_on_hand -= quantity;
      inventory.quantity_available = inventory.quantity_on_hand - inventory.quantity_reserved;

      // Update stock status
      if (inventory.quantity_on_hand === 0) {
        inventory.stock_status = 'out_of_stock';
      } else if (inventory.quantity_on_hand < inventory.reorder_level) {
        inventory.stock_status = 'low_stock';
      }

      await inventory.save();

      // Record history
      const history = await this.recordInventoryHistory(
        inventory_id,
        inventory.warehouse_id,
        null,
        order_id || null,
        'stock_out',
        -quantity,
        quantity_before,
        inventory.quantity_on_hand,
        null,
        order_id?.toString() || '',
        reason,
        user_id,
        metadata
      );

      // Check if alert needed
      if (inventory.quantity_on_hand < inventory.reorder_level) {
        await this.checkAndCreateAlert(inventory_id, 'low_stock', inventory.quantity_on_hand, inventory.reorder_level);
      }

      logger.info(`Stocked out ${quantity} units for inventory ${inventory_id}: ${reason}`);
      return { inventory, history };
    } catch (error) {
      logger.error('Error recording stock out:', error);
      throw error;
    }
  }

  /**
   * Reserve inventory for a pending order
   */
  static async reserveInventory(
    inventory_id: number,
    order_id: number,
    quantity: number,
    user_id?: number,
    reserved_price?: number
  ): Promise<ReservedInventory> {
    try {
      const inventory = await Inventory.findByPk(inventory_id);
      if (!inventory) throw new NotFoundError('Inventory not found');

      if (inventory.quantity_available < quantity) {
        throw new ValidationError(
          `Cannot reserve ${quantity} units. Available: ${inventory.quantity_available}`
        );
      }

      // Create reservation
      const reservation = await ReservedInventory.create({
        inventory_id,
        order_id,
        quantity_reserved: quantity,
        reserved_by: user_id,
        reserved_price,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour hold
      });

      // Update inventory reserved quantity
      inventory.quantity_reserved += quantity;
      inventory.quantity_available = inventory.quantity_on_hand - inventory.quantity_reserved;
      await inventory.save();

      logger.info(`Reserved ${quantity} units from inventory ${inventory_id} for order ${order_id}`);
      return reservation;
    } catch (error) {
      logger.error('Error reserving inventory:', error);
      throw error;
    }
  }

  /**
   * Unreserve inventory (if order is cancelled)
   */
  static async unreserveInventory(
    reservation_id: number,
    reason?: string
  ): Promise<ReservedInventory> {
    try {
      const reservation = await ReservedInventory.findByPk(reservation_id);
      if (!reservation) throw new NotFoundError('Reservation not found');

      const inventory = await Inventory.findByPk(reservation.inventory_id);
      if (!inventory) throw new NotFoundError('Inventory not found');

      // Update reservation status
      reservation.status = 'released';
      await reservation.save();

      // Update inventory
      inventory.quantity_reserved -= reservation.quantity_reserved;
      inventory.quantity_available = inventory.quantity_on_hand - inventory.quantity_reserved;
      await inventory.save();

      logger.info(`Unreserved ${reservation.quantity_reserved} units for inventory ${inventory.id}`);
      return reservation;
    } catch (error) {
      logger.error('Error unreserving inventory:', error);
      throw error;
    }
  }

  /**
   * Adjust inventory (manual correction, damage, loss, etc.)
   */
  static async adjustInventory(
    inventory_id: number,
    adjustment_quantity: number,
    reason: string,
    user_id?: number,
    metadata: any = {}
  ): Promise<{ inventory: Inventory; history: InventoryHistory }> {
    try {
      const inventory = await Inventory.findByPk(inventory_id);
      if (!inventory) throw new NotFoundError('Inventory not found');

      const quantity_before = inventory.quantity_on_hand;

      if (adjustment_quantity > 0) {
        inventory.quantity_on_hand += adjustment_quantity;
      } else {
        if (Math.abs(adjustment_quantity) > inventory.quantity_on_hand) {
          throw new ValidationError('Cannot adjust inventory below zero');
        }
        inventory.quantity_on_hand += adjustment_quantity; // adjustment_quantity is negative
      }

      inventory.quantity_available = inventory.quantity_on_hand - inventory.quantity_reserved;

      // Update stock status
      if (inventory.quantity_on_hand === 0) {
        inventory.stock_status = 'out_of_stock';
      } else if (inventory.quantity_on_hand < inventory.reorder_level) {
        inventory.stock_status = 'low_stock';
      } else {
        inventory.stock_status = 'in_stock';
      }

      await inventory.save();

      // Record history
      const history = await this.recordInventoryHistory(
        inventory_id,
        inventory.warehouse_id,
        null,
        null,
        'adjustment',
        adjustment_quantity,
        quantity_before,
        inventory.quantity_on_hand,
        null,
        '',
        reason,
        user_id,
        metadata
      );

      logger.info(`Adjusted inventory ${inventory_id} by ${adjustment_quantity}: ${reason}`);
      return { inventory, history };
    } catch (error) {
      logger.error('Error adjusting inventory:', error);
      throw error;
    }
  }

  /**
   * Mark inventory as damaged
   */
  static async recordDamage(
    inventory_id: number,
    batch_id: number | null,
    quantity: number,
    reason: string,
    user_id?: number
  ): Promise<{ inventory: Inventory; history: InventoryHistory }> {
    try {
      const inventory = await Inventory.findByPk(inventory_id);
      if (!inventory) throw new NotFoundError('Inventory not found');

      const quantity_before = inventory.quantity_on_hand;

      // Update batch if applicable
      if (batch_id) {
        const batch = await InventoryBatch.findByPk(batch_id);
        if (batch) {
          batch.quantity_damaged += quantity;
          batch.quantity_remaining = batch.quantity_received - batch.quantity_sold - batch.quantity_damaged;
          await batch.save();
        }
      }

      // Update inventory
      inventory.quantity_on_hand -= quantity;
      inventory.quantity_defective += quantity;
      inventory.quantity_available = inventory.quantity_on_hand - inventory.quantity_reserved;

      if (inventory.quantity_on_hand === 0) {
        inventory.stock_status = 'out_of_stock';
      }

      await inventory.save();

      // Record history
      const history = await this.recordInventoryHistory(
        inventory_id,
        inventory.warehouse_id,
        batch_id,
        null,
        'damage',
        -quantity,
        quantity_before,
        inventory.quantity_on_hand,
        null,
        '',
        `Damage recorded: ${reason}`,
        user_id
      );

      logger.info(`Recorded ${quantity} damaged units for inventory ${inventory_id}`);
      return { inventory, history };
    } catch (error) {
      logger.error('Error recording damage:', error);
      throw error;
    }
  }

  /**
   * Check and create low stock alert
   */
  static async checkAndCreateAlert(
    inventory_id: number,
    alert_type: string,
    current_quantity: number,
    threshold: number
  ): Promise<InventoryAlert | null> {
    try {
      // Check if recent alert already exists
      const recentAlert = await InventoryAlert.findOne({
        where: {
          inventory_id,
          alert_type,
          status: 'pending',
          triggered_at: {
            [Op.gt]: new Date(Date.now() - 60 * 60 * 1000), // within last hour
          },
        },
      });

      if (recentAlert) {
        return null; // Alert already sent recently
      }

      const alert = await InventoryAlert.create({
        inventory_id,
        alert_type,
        current_quantity,
        threshold,
        triggered_at: new Date(),
        status: 'pending',
      });

      logger.warn(`Alert created for inventory ${inventory_id}: ${alert_type}`);
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      return null;
    }
  }

  /**
   * Get inventory details
   */
  static async getInventory(inventory_id: number): Promise<Inventory | null> {
    try {
      return await Inventory.findByPk(inventory_id, {
        include: [
          { model: Product, attributes: ['id', 'name', 'sku'] },
          { model: Warehouse, attributes: ['id', 'name', 'code'] },
          { model: InventoryBatch, limit: 10, order: [['created_at', 'DESC']] },
          { model: InventoryAlert, limit: 5, order: [['created_at', 'DESC']] },
        ],
      });
    } catch (error) {
      logger.error('Error fetching inventory:', error);
      throw error;
    }
  }

  /**
   * Get product inventory across all warehouses
   */
  static async getProductInventory(product_id: number): Promise<Inventory[]> {
    try {
      return await Inventory.findAll({
        where: { product_id },
        include: [
          { model: Warehouse, attributes: ['id', 'name', 'code'] },
        ],
        order: [['quantity_on_hand', 'DESC']],
      });
    } catch (error) {
      logger.error('Error fetching product inventory:', error);
      throw error;
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(warehouse_id?: number): Promise<Inventory[]> {
    try {
      const where: any = {
        stock_status: ['low_stock', 'out_of_stock'],
      };

      if (warehouse_id) {
        where.warehouse_id = warehouse_id;
      }

      return await Inventory.findAll({
        where,
        include: [
          { model: Product, attributes: ['id', 'name', 'sku'] },
          { model: Warehouse, attributes: ['id', 'name', 'code'] },
        ],
        order: [['quantity_on_hand', 'ASC']],
      });
    } catch (error) {
      logger.error('Error fetching low stock items:', error);
      throw error;
    }
  }

  /**
   * Get inventory history
   */
  static async getInventoryHistory(
    inventory_id: number,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ data: InventoryHistory[]; count: number }> {
    try {
      const { count, rows } = await InventoryHistory.findAndCountAll({
        where: { inventory_id },
        include: [
          { model: User, attributes: ['id', 'first_name', 'last_name'] },
          { model: InventoryBatch, attributes: ['batch_number'] },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return { data: rows, count };
    } catch (error) {
      logger.error('Error fetching inventory history:', error);
      throw error;
    }
  }

  /**
   * Record inventory history (internal method)
   */
  private static async recordInventoryHistory(
    inventory_id: number,
    warehouse_id: number,
    batch_id: number | null,
    order_id: number | null,
    transaction_type: string,
    quantity_change: number,
    quantity_before: number,
    quantity_after: number,
    unit_cost: number | null,
    reference: string | null,
    reason: string,
    user_id?: number,
    metadata: any = {}
  ): Promise<InventoryHistory> {
    return await InventoryHistory.create({
      inventory_id,
      warehouse_id,
      batch_id,
      order_id,
      user_id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      unit_cost,
      reference,
      reason,
      metadata,
      status: 'completed',
      triggered_at: new Date(),
    });
  }

  /**
   * Get warehouse inventory summary
   */
  static async getWarehouseInventorySummary(warehouse_id: number): Promise<any> {
    try {
      const inventories = await Inventory.findAll({
        where: { warehouse_id },
        include: [{ model: Product, attributes: ['id', 'name'] }],
      });

      return {
        total_items: inventories.length,
        total_quantity: inventories.reduce((sum, inv) => sum + inv.quantity_on_hand, 0),
        total_reserved: inventories.reduce((sum, inv) => sum + inv.quantity_reserved, 0),
        total_available: inventories.reduce((sum, inv) => sum + inv.quantity_available, 0),
        low_stock_count: inventories.filter((inv) => inv.stock_status === 'low_stock').length,
        out_of_stock_count: inventories.filter((inv) => inv.stock_status === 'out_of_stock').length,
      };
    } catch (error) {
      logger.error('Error getting warehouse summary:', error);
      throw error;
    }
  }

  /**
   * Get expiring batches
   */
  static async getExpiringBatches(days_until_expiry: number = 30): Promise<InventoryBatch[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days_until_expiry);

      return await InventoryBatch.findAll({
        where: {
          expiry_date: {
            [Op.between]: [new Date(), futureDate],
          },
          status: 'active',
          quantity_remaining: {
            [Op.gt]: 0,
          },
        },
        include: [
          { model: Inventory, include: [{ model: Product }] },
        ],
        order: [['expiry_date', 'ASC']],
      });
    } catch (error) {
      logger.error('Error fetching expiring batches:', error);
      throw error;
    }
  }
}
