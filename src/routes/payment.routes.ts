import { Router } from 'express';
import {
  processPayment,
  getPaymentMethods,
  getOrderPayments,
  getMyPayments,
  getPaymentById,
  confirmPayment,
  refundPayment,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

/**
 * GET /api/v1/payments/methods
 * List all payment methods with availability status.
 * Public — shown on checkout screen.
 */
router.get('/methods', getPaymentMethods);

/**
 * POST /api/v1/payments/process
 * Initiate / complete a payment for an order.
 * Body: { order_id, method, phone? }
 * Auth: required
 */
router.post('/process', authenticate, processPayment);

/**
 * GET /api/v1/payments/my-payments
 * Current user's payment history.
 * Auth: required
 */
router.get('/my-payments', authenticate, getMyPayments);

/**
 * GET /api/v1/payments/order/:orderId
 * All payments for a given order (user must own the order).
 * Auth: required
 */
router.get('/order/:orderId', authenticate, getOrderPayments);

/**
 * POST /api/v1/payments/run-confirmation-job
 * Manually trigger the COD confirmation cron job (admin only).
 * Auth: required + MANAGE_ORDER permission
 */
router.post('/run-confirmation-job', authenticate, authorize('MANAGE_ORDER'), async (_req, res) => {
  try {
    const { runConfirmationJob } = await import('../jobs/payment-confirmation.job');
    await runConfirmationJob();
    res.json({ success: true, data: { message: 'Confirmation job completed' } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/payments/:id
 * Single payment detail.
 * Auth: required
 */
router.get('/:id', authenticate, getPaymentById);

/**
 * POST /api/v1/payments/:id/confirm
 * Confirm a pending payment (telco webhook / admin).
 * Body: { provider_ref? }
 * Auth: required (TODO: restrict to admin or signed webhook)
 */
router.post('/:id/confirm', authenticate, confirmPayment);

/**
 * POST /api/v1/payments/:id/refund
 * Refund a confirmed payment (admin only).
 * Body: { reason, refund_amount? }
 * Auth: required
 */
router.post('/:id/refund', authenticate, refundPayment);

export default router;
