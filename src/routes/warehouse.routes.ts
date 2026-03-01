import { Router } from 'express';
import {
  getJobs,
  getJobById,
  createJobForOrder,
  advanceStage,
  updateItemStatus,
  assignAgent,
  generateDeliveryCode,
  confirmDelivery,
  printLabel,
  cancelJob,
  getJobStats,
} from '../controllers/warehouse.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Stats
router.get('/stats', authenticate, getJobStats);

// List jobs (filterable by ?stage=picking etc)
router.get('/', authenticate, getJobs);

// Create job for an order
router.post('/', authenticate, createJobForOrder);

// Single job
router.get('/:id', authenticate, getJobById);

// Stage actions
router.post('/:id/advance', authenticate, advanceStage);
router.post('/:id/cancel', authenticate, cancelJob);
router.post('/:id/assign-agent', authenticate, assignAgent);
router.post('/:id/generate-code', authenticate, generateDeliveryCode);
router.post('/:id/confirm-delivery', authenticate, confirmDelivery);
router.post('/:id/print-label', authenticate, printLabel);

// Item status update
router.patch('/:id/items/:itemId', authenticate, updateItemStatus);

export default router;
