import { Router } from 'express';
import {
  getJobs,
  getJobById,
  createJobForOrder,
  advanceStage,
  selectForProcessing,
  updateItemStatus,
  completePicking,
  completeShipping,
  completePacking,
  resolveQa,
  assignAgent,
  dispatchForDelivery,
  generateDeliveryCode,
  confirmDelivery,
  printLabel,
  getLabelPayload,
  cancelJob,
  getJobStats,
} from '../controllers/warehouse.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// Stats
router.get('/stats', authenticate, authorize(['VIEW_WAREHOUSE_JOB', 'VIEW_ORDER', 'VIEW_DASHBOARD']), getJobStats);

// List jobs (filterable by ?stage=picking etc)
router.get('/', authenticate, authorize(['VIEW_WAREHOUSE_JOB', 'VIEW_ORDER', 'MANAGE_ORDER']), getJobs);

// Create job for an order
router.post('/', authenticate, authorize(['SELECT_ORDER_FOR_PROCESSING', 'PROCESS_ORDER', 'MANAGE_ORDER']), createJobForOrder);

// Single job
router.get('/:id', authenticate, authorize(['VIEW_WAREHOUSE_JOB', 'VIEW_ORDER_DETAILS', 'MANAGE_ORDER']), getJobById);

// Stage actions
router.post('/:id/select-for-processing', authenticate, authorize(['SELECT_ORDER_FOR_PROCESSING', 'PROCESS_ORDER', 'MANAGE_ORDER']), selectForProcessing);
router.post('/:id/advance', authenticate, authorize(['PROCESS_ORDER', 'MANAGE_ORDER']), advanceStage);
router.post('/:id/complete-picking', authenticate, authorize(['COMPLETE_PICKING_STAGE', 'PROCESS_ORDER', 'MANAGE_ORDER']), completePicking);
router.post('/:id/complete-shipping', authenticate, authorize(['COMPLETE_SHIPPING_STAGE', 'SHIP_ORDER', 'MANAGE_ORDER']), completeShipping);
router.post('/:id/complete-packing', authenticate, authorize(['COMPLETE_PACKING_STAGE', 'PROCESS_ORDER', 'MANAGE_ORDER']), completePacking);
router.post('/:id/resolve-qa', authenticate, authorize(['RESOLVE_WAREHOUSE_QA', 'PROCESS_ORDER', 'MANAGE_ORDER']), resolveQa);
router.post('/:id/cancel', authenticate, authorize(['CANCEL_WAREHOUSE_JOB', 'CANCEL_ORDER', 'MANAGE_ORDER']), cancelJob);
router.post('/:id/assign-agent', authenticate, authorize(['ASSIGN_DELIVERY_AGENT', 'SHIP_ORDER', 'MANAGE_ORDER']), assignAgent);
router.post('/:id/dispatch', authenticate, authorize(['DISPATCH_FOR_DELIVERY', 'SHIP_ORDER', 'MANAGE_ORDER']), dispatchForDelivery);
router.post('/:id/generate-code', authenticate, authorize(['GENERATE_DELIVERY_CODE', 'SHIP_ORDER', 'MANAGE_ORDER']), generateDeliveryCode);
router.post('/:id/confirm-delivery', authenticate, authorize(['CONFIRM_DELIVERY_CODE', 'COMPLETE_ORDER', 'MANAGE_ORDER']), confirmDelivery);
router.post('/:id/print-label', authenticate, authorize(['PRINT_DELIVERY_LABEL', 'SHIP_ORDER', 'MANAGE_ORDER']), printLabel);
router.get('/:id/label', authenticate, authorize(['PRINT_DELIVERY_LABEL', 'SHIP_ORDER', 'MANAGE_ORDER']), getLabelPayload);

// Item status update
router.patch('/:id/items/:itemId', authenticate, authorize(['PICK_WAREHOUSE_ITEM', 'SHIP_CHECK_WAREHOUSE_ITEM', 'PACK_WAREHOUSE_ITEM', 'PROCESS_ORDER', 'SHIP_ORDER', 'MANAGE_ORDER']), updateItemStatus);

export default router;
