import cron from 'node-cron';
import { Op } from 'sequelize';
import Payment from '../models/Payment';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import User from '../models/User';
import { EmailService } from '../services/email.service';
import { WarehouseService } from '../services/warehouse.service';
import { PAYMENT_METHOD_LABELS } from '../models/Payment';
import logger from '../utils/logger';

/**
 * Payment Confirmation Job
 *
 * Runs every 3 minutes.
 * Finds all Cash on Delivery payments that are still "pending" and:
 *   1. Sets payment.status   → 'confirmed'
 *   2. Sets order.status     → 'confirmed'
 *   3. Sets order.payment_status → 'pending'  (cash not yet physically collected)
 *   4. Sends the customer a detailed confirmation email with COD payment instructions
 */

const JOB_NAME = 'PaymentConfirmationJob';

async function runConfirmationJob(): Promise<void> {
  logger.info(`⏱  [${JOB_NAME}] Running…`);

  try {
    // Find all pending COD payments older than 30 seconds
    // (give the API a moment to finish the order-placement request)
    const cutoff = new Date(Date.now() - 30_000);

    const pendingPayments = await Payment.findAll({
      where: {
        method:     'cash_on_delivery',
        status:     'pending',
        created_at: { [Op.lte]: cutoff },
      },
      include: [
        {
          model: Order,
          include: [
            { model: OrderItem },
            {
              model: User,
              attributes: ['id', 'email', 'first_name', 'last_name', 'phone'],
            },
          ],
        },
      ],
    });

    if (pendingPayments.length === 0) {
      logger.info(`✅ [${JOB_NAME}] No pending COD payments found.`);
      return;
    }

    logger.info(`📋 [${JOB_NAME}] Confirming ${pendingPayments.length} COD payment(s)…`);

    for (const payment of pendingPayments) {
      try {
        const order = (payment as any).order as Order | null;
        if (!order) {
          logger.warn(`[${JOB_NAME}] Payment ${payment.id} has no associated order — skipping`);
          continue;
        }

        // ── Confirm payment ──
        await payment.update({
          status:   'confirmed',
          paid_at:  new Date(),
          metadata: {
            ...(payment.metadata as Record<string, any> || {}),
            confirmed_at: new Date().toISOString(),
            confirmed_by: 'payment_confirmation_cron',
          },
        });

        // ── Confirm order ──
        await order.update({
          status:         'confirmed',
          payment_status: 'pending',     // cash will be collected at door
        });

        logger.info(`✅ [${JOB_NAME}] Payment ${payment.reference} confirmed → order #${order.order_number}`);

        // ── Send confirmation email ──
        const user = (order as any).user as User | null;
        if (user?.email) {
          const items = ((order as any).items || []).map((item: any) => ({
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
                full_name:      sa.full_name || sa.name || [user.first_name, user.last_name].filter(Boolean).join(' '),
                address_line_1: sa.address_line_1 || sa.address_line1 || sa.address || '',
                address_line_2: sa.address_line_2 || sa.address_line2 || '',
                city:           sa.city   || '',
                state:          sa.state  || '',
                country:        sa.country || 'Uganda',
                phone:          sa.phone  || (user as any).phone || '',
              }
            : undefined;

          await EmailService.sendOrderConfirmed({
            to:            user.email,
            firstName:     user.first_name || 'Customer',
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
          });
        } else {
          logger.warn(`[${JOB_NAME}] No email for user ${order.user_id} on order #${order.order_number}`);
        }
      } catch (err) {
        // Don't let a single failure stop the rest
        logger.error(`[${JOB_NAME}] Failed to confirm payment ${payment.id}:`, err);
      }
    }

    logger.info(`✅ [${JOB_NAME}] Batch complete.`);
  } catch (err) {
    logger.error(`❌ [${JOB_NAME}] Job error:`, err);
  }
}

/**
 * Start the cron schedule.
 * Call this once from app.ts after the database is connected.
 *
 * Schedule: every 3 minutes  →  "* /3 * * * *"
 */
export function startPaymentConfirmationJob(): void {
  cron.schedule('*/3 * * * *', runConfirmationJob, {
    name:     JOB_NAME,
    timezone: 'Africa/Kampala',
  });

  logger.info(`🕐 [${JOB_NAME}] Scheduled — runs every 3 minutes.`);
}

/** Manually trigger a run (useful for admin endpoint or tests) */
export { runConfirmationJob };
