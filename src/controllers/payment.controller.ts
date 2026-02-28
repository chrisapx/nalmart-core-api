import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { PaymentService } from '../services/payment.service';
import { successResponse } from '../utils/response';
import { BadRequestError } from '../utils/errors';

// ── Process a payment ─────────────────────────────────────────────────────────

export const processPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) throw new BadRequestError('Authentication required');

    const { order_id, method, phone, notes } = req.body;

    if (!order_id) throw new BadRequestError('order_id is required');
    if (!method)   throw new BadRequestError('payment method is required');

    const result = await PaymentService.processPayment({
      order_id: Number(order_id),
      user_id:  req.user.id,
      method,
      phone,
      notes,
    });

    successResponse(res, result, 'Payment processed successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ── Get available payment methods ─────────────────────────────────────────────

export const getPaymentMethods = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const methods = PaymentService.getAvailableMethods();
    successResponse(res, methods, 'Payment methods retrieved');
  } catch (err) {
    next(err);
  }
};

// ── Get payments for an order ─────────────────────────────────────────────────

export const getOrderPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) throw new BadRequestError('Authentication required');

    const { orderId } = req.params;
    const payments = await PaymentService.getOrderPayments(Number(orderId));
    successResponse(res, payments, 'Payments retrieved');
  } catch (err) {
    next(err);
  }
};

// ── Get current user's payment history ────────────────────────────────────────

export const getMyPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) throw new BadRequestError('Authentication required');

    const limit  = Math.min(Number(req.query.limit  || 20), 50);
    const offset = Number(req.query.offset || 0);

    const result = await PaymentService.getUserPayments(req.user.id, limit, offset);
    successResponse(res, result, 'Payment history retrieved');
  } catch (err) {
    next(err);
  }
};

// ── Get a single payment by ID ────────────────────────────────────────────────

export const getPaymentById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) throw new BadRequestError('Authentication required');

    const payment = await PaymentService.getPaymentById(Number(req.params.id));

    // Users can only see their own payments (admins skip this)
    if ((payment as any).user_id !== req.user.id) {
      throw new BadRequestError('Not authorised to view this payment');
    }

    successResponse(res, payment, 'Payment retrieved');
  } catch (err) {
    next(err);
  }
};

// ── Confirm a payment (webhook / admin) ───────────────────────────────────────

export const confirmPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }          = req.params;
    const { provider_ref } = req.body;

    const result = await PaymentService.confirmPayment(Number(id), provider_ref);
    successResponse(res, result, 'Payment confirmed');
  } catch (err) {
    next(err);
  }
};

// ── Refund a payment (admin) ──────────────────────────────────────────────────

export const refundPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }                    = req.params;
    const { reason, refund_amount } = req.body;

    if (!reason) throw new BadRequestError('Refund reason is required');

    const payment = await PaymentService.refundPayment(
      Number(id),
      reason,
      refund_amount ? Number(refund_amount) : undefined,
    );

    successResponse(res, payment, 'Payment refunded');
  } catch (err) {
    next(err);
  }
};
