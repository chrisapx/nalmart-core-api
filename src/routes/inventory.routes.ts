import { Router as ExpressRouter } from 'express';
import * as InventoryController from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = ExpressRouter();

// All inventory routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/inventory/initialize
 * Initialize inventory for a product
 * Required: create:inventory permission
 */
router.post('/initialize', authorize('create:inventory'), InventoryController.initializeInventory);

/**
 * POST /api/v1/inventory/stock-in
 * Record incoming stock
 * Required: manage:inventory permission
 */
router.post('/stock-in', authorize('manage:inventory'), InventoryController.stockIn);

/**
 * POST /api/v1/inventory/stock-out
 * Record outgoing stock
 * Required: manage:inventory permission
 */
router.post('/stock-out', authorize('manage:inventory'), InventoryController.stockOut);

/**
 * POST /api/v1/inventory/reserve
 * Reserve inventory for order
 * Required: manage:inventory permission
 */
router.post('/reserve', authorize('manage:inventory'), InventoryController.reserveInventory);

/**
 * PUT /api/v1/inventory/unreserve/:reservation_id
 * Unreserve inventory
 * Required: manage:inventory permission
 */
router.put('/unreserve/:reservation_id', authorize('manage:inventory'), InventoryController.unreserveInventory);

/**
 * PUT /api/v1/inventory/adjust
 * Adjust inventory (manual correction)
 * Required: manage:inventory permission
 */
router.put('/adjust', authorize('manage:inventory'), InventoryController.adjustInventory);

/**
 * POST /api/v1/inventory/damage
 * Record damaged inventory
 * Required: manage:inventory permission
 */
router.post('/damage', authorize('manage:inventory'), InventoryController.recordDamage);

/**
 * GET /api/v1/inventory/:inventoryId
 * Get inventory details
 * Required: view:inventory permission
 */
router.get('/:inventoryId', authorize('view:inventory'), InventoryController.getInventory);

/**
 * GET /api/v1/inventory/product/:productId
 * Get product inventory across all warehouses
 * Required: view:inventory permission
 */
router.get('/product/:productId', authorize('view:inventory'), InventoryController.getProductInventory);

/**
 * GET /api/v1/inventory/low-stock
 * Get low stock items
 * Query params: warehouseId (optional)
 * Required: view:inventory permission
 */
router.get('/low-stock/list', authorize('view:inventory'), InventoryController.getLowStockItems);

/**
 * GET /api/v1/inventory/:inventoryId/history
 * Get inventory history
 * Query params: limit (default 100), offset (default 0)
 * Required: view:inventory permission
 */
router.get('/:inventoryId/history', authorize('view:inventory'), InventoryController.getInventoryHistory);

/**
 * GET /api/v1/inventory/warehouse/:warehouseId/summary
 * Get warehouse inventory summary
 * Required: view:inventory permission
 */
router.get('/warehouse/:warehouseId/summary', authorize('view:inventory'), InventoryController.getWarehouseInventorySummary);

/**
 * GET /api/v1/inventory/expiring/batches
 * Get expiring batches
 * Query params: days (default 30)
 * Required: view:inventory permission
 */
router.get('/expiring/batches', authorize('view:inventory'), InventoryController.getExpiringBatches);

export default router;
