import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { InventoryService } from '../services/inventory.service';
import { successResponse } from '../utils/response';
import logger from '../utils/logger';

/**
 * Initialize inventory for a product
 */
export const initializeInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { product_id, warehouse_id, initial_quantity, reorder_level, reorder_quantity, cost_per_unit } =
      req.body;

    const inventory = await InventoryService.initializeInventory(
      product_id,
      warehouse_id,
      initial_quantity,
      reorder_level,
      reorder_quantity,
      cost_per_unit
    );

    successResponse(res, inventory, 'Inventory initialized successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Record incoming stock
 */
export const stockIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      inventory_id,
      quantity,
      batch_number,
      cost_per_unit,
      received_date,
      supplier,
      reference,
      metadata,
    } = req.body;

    const result = await InventoryService.stockIn(
      inventory_id,
      quantity,
      batch_number,
      cost_per_unit,
      received_date ? new Date(received_date) : new Date(),
      supplier,
      reference,
      metadata,
      req.user?.id
    );

    successResponse(res, result, 'Stock received successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Record outgoing stock
 */
export const stockOut = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inventory_id, quantity, reason, order_id, metadata } = req.body;

    const result = await InventoryService.stockOut(
      inventory_id,
      quantity,
      reason,
      order_id,
      req.user?.id,
      metadata
    );

    successResponse(res, result, 'Stock removed successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Reserve inventory for order
 */
export const reserveInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inventory_id, order_id, quantity, reserved_price } = req.body;

    const reservation = await InventoryService.reserveInventory(
      inventory_id,
      order_id,
      quantity,
      req.user?.id,
      reserved_price
    );

    successResponse(res, reservation, 'Inventory reserved successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Unreserve inventory
 */
export const unreserveInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reservation_id } = req.params;
    const { reason } = req.body;

    const reservation = await InventoryService.unreserveInventory(parseInt(reservation_id as string), reason);

    successResponse(res, reservation, 'Inventory unreserved successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust inventory
 */
export const adjustInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inventory_id, adjustment_quantity, reason, metadata } = req.body;

    const result = await InventoryService.adjustInventory(
      inventory_id,
      adjustment_quantity,
      reason,
      req.user?.id,
      metadata
    );

    successResponse(res, result, 'Inventory adjusted successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Record damage
 */
export const recordDamage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inventory_id, batch_id, quantity, reason } = req.body;

    const result = await InventoryService.recordDamage(inventory_id, batch_id, quantity, reason, req.user?.id);

    successResponse(res, result, 'Damage recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory details
 */
export const getInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inventoryId } = req.params;

    const inventory = await InventoryService.getInventory(parseInt(inventoryId as string));

    if (!inventory) {
      return void successResponse(res, null, 'Inventory not found', 404);
    }

    successResponse(res, inventory, 'Inventory retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get product inventory across all warehouses
 */
export const getProductInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId } = req.params;

    const inventories = await InventoryService.getProductInventory(parseInt(productId as string));

    successResponse(res, inventories, 'Product inventory retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock items
 */
export const getLowStockItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { warehouseId } = req.query;

    const warehouseIdValue = warehouseId ? parseInt((Array.isArray(warehouseId) ? warehouseId[0] : warehouseId) as string) : undefined;
    const items = await InventoryService.getLowStockItems(warehouseIdValue);

    successResponse(res, items, 'Low stock items retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory history
 */
export const getInventoryHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { inventoryId } = req.params;
    const { limit = '100', offset = '0' } = req.query;

    const limitValue = parseInt((Array.isArray(limit) ? limit[0] : limit) as string);
    const offsetValue = parseInt((Array.isArray(offset) ? offset[0] : offset) as string);

    const result = await InventoryService.getInventoryHistory(
      parseInt(inventoryId as string),
      limitValue,
      offsetValue
    );

    successResponse(res, result.data, 'Inventory history retrieved successfully', 200, {
      pagination: { total: result.count, limit: limitValue, offset: offsetValue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get warehouse inventory summary
 */
export const getWarehouseInventorySummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { warehouseId } = req.params;

    const summary = await InventoryService.getWarehouseInventorySummary(parseInt(warehouseId as string));

    successResponse(res, summary, 'Warehouse inventory summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get expiring batches
 */
export const getExpiringBatches = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days = '30' } = req.query;

    const daysValue = parseInt((Array.isArray(days) ? days[0] : days) as string);
    const batches = await InventoryService.getExpiringBatches(daysValue);

    successResponse(res, batches, 'Expiring batches retrieved successfully');
  } catch (error) {
    next(error);
  }
};
