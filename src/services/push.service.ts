import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription';
import env from '../config/env';
import logger from '../utils/logger';

// ── Configure VAPID once on module load ────────────────────────────────────────
webpush.setVapidDetails(
  `mailto:${env.SMTP_USER || 'push@nalmart.com'}`,
  env.VAPID_PUBLIC_KEY!,
  env.VAPID_PRIVATE_KEY!,
);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;        // large product/hero image shown below the body
  tag?: string;          // collapses duplicate notifications of same type
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

// ── PushService ────────────────────────────────────────────────────────────────

export class PushService {

  // ── Subscription management ────────────────────────────────────────────────

  static async upsertSubscription(opts: {
    endpoint: string;
    p256dh: string;
    auth: string;
    role: 'client' | 'admin';
    userId?: number | null;
    userAgent?: string;
  }): Promise<PushSubscription> {
    const existing = await PushSubscription.findOne({ where: { endpoint: opts.endpoint } });
    if (existing) {
      existing.p256dh    = opts.p256dh;
      existing.auth      = opts.auth;
      existing.role      = opts.role;
      existing.user_id   = opts.userId ?? existing.user_id;
      existing.user_agent = opts.userAgent ?? existing.user_agent;
      await existing.save();
      return existing;
    }
    return PushSubscription.create({
      endpoint:   opts.endpoint,
      p256dh:     opts.p256dh,
      auth:       opts.auth,
      role:       opts.role,
      user_id:    opts.userId ?? null,
      user_agent: opts.userAgent ?? null,
    });
  }

  static async removeSubscription(endpoint: string): Promise<void> {
    await PushSubscription.destroy({ where: { endpoint } });
  }

  static getPublicKey(): string {
    return env.VAPID_PUBLIC_KEY!;
  }

  // ── Low-level send to a single subscription ────────────────────────────────

  private static async sendOne(sub: PushSubscription, payload: PushPayload): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 3600 },
      );
    } catch (err: any) {
      const code: number | undefined = err?.statusCode;

      if (code === 404 || code === 410) {
        // Subscription definitively gone — clean up silently
        await sub.destroy().catch(() => {});
        logger.debug(`[Push] Removed stale subscription ${sub.id} (${code})`);

      } else if (code === 400 || code === 401 || code === 403) {
        // Invalid / expired subscription or VAPID rejected — log details and clean up
        // so the device re-subscribes on next page load with fresh credentials
        logger.warn(`[Push] Sub ${sub.id} rejected (${code}): ${err?.body || err?.message} — removing`);
        await sub.destroy().catch(() => {});

      } else if (code === 413) {
        // Payload too large — retry once without the image field
        logger.warn(`[Push] Sub ${sub.id} payload too large (413), retrying without image`);
        if (payload.image) {
          const { image: _img, ...trimmed } = payload;
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify(trimmed),
              { TTL: 3600 },
            );
          } catch (retryErr: any) {
            logger.warn(`[Push] Sub ${sub.id} retry without image also failed: ${retryErr?.message}`);
          }
        }

      } else {
        logger.warn(`[Push] Failed to send to sub ${sub.id} (status=${code ?? 'unknown'}): ${err?.body || err?.message}`);
      }
    }
  }

  // ── Fan-out helpers ────────────────────────────────────────────────────────

  /** Send to ALL admin subscriptions */
  static async notifyAdmins(payload: PushPayload): Promise<void> {
    const subs = await PushSubscription.findAll({ where: { role: 'admin' } });
    if (!subs.length) return;
    await Promise.all(subs.map((s) => PushService.sendOne(s, payload)));
    logger.debug(`[Push] Notified ${subs.length} admin subscriber(s): ${payload.title}`);
  }

  /** Send to all subscriptions belonging to a specific user */
  static async notifyUser(userId: number, payload: PushPayload): Promise<void> {
    const subs = await PushSubscription.findAll({ where: { user_id: userId } });
    if (!subs.length) return;
    await Promise.all(subs.map((s) => PushService.sendOne(s, payload)));
    logger.debug(`[Push] Notified user ${userId} (${subs.length} device[s]): ${payload.title}`);
  }

  // ── Business-event helpers ─────────────────────────────────────────────────

  static async onNewOrder(opts: {
    orderId: number;
    orderNumber: string;
    customerName: string;
    total: number;
    currency: string;
  }): Promise<void> {
    const fmt = (n: number) => n.toLocaleString();
    await PushService.notifyAdmins({
      title: '🛒 New Order Received',
      body:  `#${opts.orderNumber} — ${opts.customerName} · ${opts.currency} ${fmt(opts.total)}`,
      icon:  '/logo.svg',
      badge: '/logo.svg',
      tag:   `new-order-${opts.orderNumber}`,
      data:  { url: `/orders/${opts.orderId}`, orderId: opts.orderId },
      actions: [{ action: 'view', title: 'View Order' }],
    });
  }

  static async onOrderStatusChanged(opts: {
    userId: number;
    orderId: number;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    image?: string;   // first product image shown in the notification
  }): Promise<void> {
    const statusMessages: Record<string, { title: string; body: string }> = {
      pending:          { title: '🛒 Order Placed',           body: `Your order #${opts.orderNumber} has been placed and is awaiting confirmation.` },
      confirmed:        { title: '✅ Order Confirmed',        body: `Order #${opts.orderNumber} has been confirmed and is being prepared.` },
      processing:       { title: '⚙️ Order Processing',       body: `We're picking and preparing your items for order #${opts.orderNumber}.` },
      picked:           { title: '🧺 Items Picked',           body: `All items for order #${opts.orderNumber} have been picked and are being packed.` },
      packed:           { title: '📦 Order Packed',           body: `Order #${opts.orderNumber} is packed and ready to dispatch.` },
      shipped:          { title: '🚚 Order Shipped',          body: `Your order #${opts.orderNumber} is on its way to you.` },
      in_transit:       { title: '🚛 Order In Transit',       body: `Order #${opts.orderNumber} is in transit and heading your way.` },
      out_for_delivery: { title: '🛵 Out for Delivery',       body: `Rider is heading your way now! Order #${opts.orderNumber}.` },
      delivered:        { title: '🎉 Order Delivered',        body: `Order #${opts.orderNumber} has been delivered. Enjoy!` },
      cancelled:        { title: '❌ Order Cancelled',        body: `Order #${opts.orderNumber} has been cancelled.` },
    };

    const msg = statusMessages[opts.status];
    if (!msg) return;

    // Notify the customer
    await PushService.notifyUser(opts.userId, {
      title: msg.title,
      body:  msg.body,
      icon:  '/logo.svg',
      badge: '/logo.svg',
      image: opts.image || undefined,
      tag:   `order-status-${opts.orderNumber}`,
      data:  { url: `/orders?order=${opts.orderNumber}`, orderId: opts.orderId },
      actions: [{ action: 'view', title: 'View Order' }],
    });

    // Also notify admins for all transitions
    await PushService.notifyAdmins({
      title: `Order #${opts.orderNumber} → ${opts.status.replace(/_/g, ' ')}`,
      body:  `Status updated to ${opts.status.replace(/_/g, ' ')}.`,
      icon:  '/logo.svg',
      badge: '/logo.svg',
      tag:   `admin-order-status-${opts.orderNumber}-${opts.status}`,
      data:  { url: `/orders/${opts.orderId}`, orderId: opts.orderId },
    });
  }
}

export default PushService;
