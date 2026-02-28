import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import User from '../models/User';
import DeliveryAddress from '../models/DeliveryAddress';
import DeliveryMethod from '../models/DeliveryMethod';
import Payment, { PaymentMethod, PaymentStatus, PAYMENT_METHOD_LABELS } from '../models/Payment';
import { EmailService, OrderEmailItem, OrderEmailData } from './email.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProcessPaymentInput {
  order_id: number;
  user_id: number;
  method: PaymentMethod;
  /** Phone for MTN / Airtel MoMo */
  phone?: string;
  notes?: string;
}

export interface PaymentResult {
  payment: Payment;
  order: Order;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a unique Nalmart payment reference: NLM-XXXXXXXX */
function generateReference(): string {
  const ts   = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NLM-${ts}-${rand}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class PaymentService {
  // ── processPayment ──────────────────────────────────────────────────────────

  /**
   * Central entry-point for all payment flows.
   * Dispatches to the appropriate handler based on `method`.
   */
  static async processPayment(data: ProcessPaymentInput): Promise<PaymentResult> {
    // ── Validate order ──
    const order = await Order.findByPk(data.order_id, {
      include: [
        { model: OrderItem },
        { model: User,           attributes: ['id', 'email', 'first_name', 'last_name', 'phone'] },
      ],
    });

    if (!order) throw new NotFoundError(`Order ${data.order_id} not found`);

    if (order.user_id !== data.user_id) {
      throw new BadRequestError('You are not authorised to pay for this order');
    }

    if (['cancelled', 'refunded', 'failed'].includes(order.status)) {
      throw new BadRequestError(`Cannot process payment for a ${order.status} order`);
    }

    // Prevent double-payment
    const existingConfirmed = await Payment.findOne({
      where: { order_id: order.id, status: 'confirmed' },
    });
    if (existingConfirmed) {
      throw new BadRequestError('This order has already been paid');
    }

    // ── Dispatch ──
    switch (data.method) {
      case 'cash_on_delivery':
        return this.handleCashOnDelivery(order, data);

      case 'mobile_money_mtn':
      case 'mobile_money_airtel':
        // Future: integrate telco API
        return this.handleMobileMoney(order, data);

      case 'card':
        throw new BadRequestError('Card payments are coming soon. Please use Cash on Delivery or Mobile Money.');

      case 'bank_transfer':
        throw new BadRequestError('Bank transfer payments are coming soon.');

      default:
        throw new BadRequestError(`Unknown payment method: ${data.method}`);
    }
  }

  // ── Cash on Delivery ────────────────────────────────────────────────────────

  /**
   * Cash on Delivery:
   *  - Creates a PENDING payment record (cash not yet collected)
   *  - Keeps order status → "pending", payment_status → "pending"
   *  - Sends "order received" email — confirmation will come via the cron job
   */
  private static async handleCashOnDelivery(
    order: Order,
    data: ProcessPaymentInput,
  ): Promise<PaymentResult> {
    logger.info(`💵 COD initiated for order #${order.order_number}`);

    const payment = await Payment.create({
      order_id:  order.id,
      user_id:   data.user_id,
      amount:    order.total_amount,
      currency:  'UGX',
      method:    'cash_on_delivery',
      status:    'pending',            // cron job will confirm this every 3 min
      reference: generateReference(),
      phone:     data.phone,
      notes:     data.notes,
      metadata: {
        created_at: new Date().toISOString(),
        note: 'Awaiting cron confirmation. Cash collected at door.',
      },
    });

    // Order stays pending — cron job moves it to confirmed
    await Order.update(
      {
        payment_method:          'cash_on_delivery',
        payment_transaction_id:  payment.reference || undefined,
      },
      { where: { id: order.id } },
    );

    // Reload
    await order.reload({
      include: [
        { model: OrderItem },
        { model: User, attributes: ['id', 'email', 'first_name', 'last_name', 'phone'] },
      ],
    });

    // Send "order received" email (non-blocking)
    this.sendReceivedEmail(order, payment).catch(() => {});

    logger.info(`⏳ COD payment ${payment.reference} created (pending) for order #${order.order_number}`);

    return { payment, order };
  }

  // ── Mobile Money (stub — ready for telco integration) ───────────────────────

  private static async handleMobileMoney(
    order: Order,
    data: ProcessPaymentInput,
  ): Promise<PaymentResult> {
    if (!data.phone) {
      throw new BadRequestError('Phone number is required for Mobile Money payments');
    }

    logger.info(`📱 Initiating ${data.method} for order #${order.order_number}`);

    const payment = await Payment.create({
      order_id:  order.id,
      user_id:   data.user_id,
      amount:    order.total_amount,
      currency:  'UGX',
      method:    data.method,
      status:    'processing',    // waiting for telco push/callback
      reference: generateReference(),
      phone:     data.phone,
      notes:     data.notes || 'Awaiting mobile money confirmation',
      metadata: {
        initiated_at: new Date().toISOString(),
        phone:        data.phone,
        provider:     data.method === 'mobile_money_mtn' ? 'MTN' : 'Airtel',
      },
    });

    // Keep order in pending until telco webhook confirms
    await Order.update(
      {
        payment_method:          data.method,
        payment_transaction_id:  payment.reference || undefined,
      },
      { where: { id: order.id } }
    );

    await order.reload();

    logger.info(`⏳ MoMo payment ${payment.reference} initiated for order #${order.order_number}`);

    return { payment, order };
  }

  // ── Webhook: confirm mobile money payment ──────────────────────────────────

  /**
   * Called by MoMo telco webhook or manual admin confirmation.
   * Marks the payment as confirmed and updates the order accordingly.
   */
  static async confirmPayment(
    paymentId: number,
    providerRef?: string,
  ): Promise<PaymentResult> {
    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Order, include: [{ model: OrderItem }, { model: User }] }],
    });

    if (!payment) throw new NotFoundError(`Payment ${paymentId} not found`);
    if (payment.status === 'confirmed') throw new BadRequestError('Payment already confirmed');
    if (['refunded', 'cancelled'].includes(payment.status)) {
      throw new BadRequestError(`Cannot confirm a ${payment.status} payment`);
    }

    await payment.update({
      status:       'confirmed',
      provider_ref: providerRef,
      paid_at:      new Date(),
    });

    const order = payment.order;
    await Order.update(
      {
        status:         'confirmed',
        payment_status: 'paid',
      },
      { where: { id: order.id } }
    );

    await order.reload({ include: [{ model: OrderItem }, { model: User }] });

    // Send confirmation email
    EmailService.sendOrderConfirmed(this.assembleEmailData(order as any, payment)).catch(() => {});

    logger.info(`✅ Payment ${payment.reference} confirmed (provider: ${providerRef})`);

    return { payment, order };
  }

  // ── Refund ─────────────────────────────────────────────────────────────────

  static async refundPayment(paymentId: number, reason: string, refundAmount?: number): Promise<Payment> {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new NotFoundError(`Payment ${paymentId} not found`);
    if (payment.status !== 'confirmed') {
      throw new BadRequestError(`Only confirmed payments can be refunded (current: ${payment.status})`);
    }

    const amount = refundAmount ?? Number(payment.amount);
    if (amount > Number(payment.amount)) {
      throw new BadRequestError('Refund amount cannot exceed the original payment amount');
    }

    await payment.update({
      status:        'refunded',
      refund_amount: amount,
      refund_reason: reason,
      refunded_at:   new Date(),
    });

    await Order.update(
      { payment_status: 'refunded', status: 'refunded' },
      { where: { id: payment.order_id } }
    );

    logger.info(`↩️  Payment ${payment.reference} refunded — ${reason}`);
    return payment;
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  static async getPaymentById(id: number): Promise<Payment> {
    const payment = await Payment.findByPk(id, {
      include: [
        { model: Order, include: [{ model: OrderItem }] },
        { model: User, attributes: ['id', 'email', 'first_name', 'last_name'] },
      ],
    });
    if (!payment) throw new NotFoundError(`Payment ${id} not found`);
    return payment;
  }

  static async getOrderPayments(orderId: number): Promise<Payment[]> {
    return Payment.findAll({
      where:   { order_id: orderId },
      order:   [['created_at', 'DESC']],
    });
  }

  static async getUserPayments(userId: number, limit = 20, offset = 0): Promise<{ data: Payment[]; count: number }> {
    const { count, rows } = await Payment.findAndCountAll({
      where:  { user_id: userId },
      order:  [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        { model: Order, attributes: ['id', 'order_number', 'status', 'total_amount', 'created_at'] },
      ],
    });
    return { data: rows, count };
  }

  // ── Payment method catalogue ─────────────────────────────────────────────────

  static getAvailableMethods(): Array<{ method: PaymentMethod; label: string; available: boolean; comingSoon: boolean }> {
    return [
      { method: 'cash_on_delivery',    label: '💵 Cash on Delivery',    available: true,  comingSoon: false },
      { method: 'mobile_money_mtn',   label: '📱 MTN Mobile Money',    available: false, comingSoon: true  },
      { method: 'mobile_money_airtel',label: '📱 Airtel Money',        available: false, comingSoon: true  },
      { method: 'card',               label: '💳 Credit / Debit Card', available: false, comingSoon: true  },
      { method: 'bank_transfer',      label: '🏦 Bank Transfer',       available: false, comingSoon: true  },
    ];
  }

  // ── Email helpers ─────────────────────────────────────────────────────────

  /**
   * Build the OrderEmailData payload from a fully-loaded order + payment.
   * Used by both payment.service and the cron job.
   */
  static assembleEmailData(order: Order, payment: Payment): OrderEmailData {
    const user = (order as any).user as User | null;
    const items: OrderEmailItem[] = ((order as any).items || []).map((item: any) => ({
      name:        item.product_name,
      sku:         item.product_sku,
      quantity:    item.quantity,
      unit_price:  Number(item.unit_price),
      total_price: Number(item.total_price),
      image_url:   item.product_image_url,
      product_id:  item.product_id,
    }));

    const sa: Record<string, string> = order.shipping_address || {};
    const deliveryAddress = Object.keys(sa).length
      ? {
          full_name:      sa.full_name || sa.name || [user?.first_name, user?.last_name].filter(Boolean).join(' '),
          address_line_1: sa.address_line_1 || sa.address_line1 || sa.address || '',
          address_line_2: sa.address_line_2 || sa.address_line2 || '',
          city:           sa.city  || '',
          state:          sa.state || '',
          country:        sa.country || 'Uganda',
          phone:          sa.phone  || (user as any)?.phone || '',
        }
      : undefined;

    return {
      to:            user?.email || '',
      firstName:     user?.first_name || 'Customer',
      orderId:       order.id,
      orderNumber:   order.order_number,
      orderDate:     order.created_at,
      items,
      subtotal:      Number(order.subtotal),
      shipping:      Number(order.shipping_amount),
      tax:           Number(order.tax_amount),
      total:         Number(order.total_amount),
      currency:      'UGX',
      paymentMethod: PAYMENT_METHOD_LABELS[payment.method] || payment.method,
      deliveryAddress,
    } as any;
  }

  private static async sendReceivedEmail(order: Order, payment: Payment): Promise<void> {
    try {
      const user = (order as any).user as User | null;
      if (!user?.email) return;
      const data = PaymentService.assembleEmailData(order, payment);
      await EmailService.sendOrderReceived(data);
    } catch (err) {
      logger.error('sendReceivedEmail error:', err);
    }
  }
}

