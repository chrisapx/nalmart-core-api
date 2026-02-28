import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface OrderEmailItem {
  name:        string;
  sku?:        string;
  quantity:    number;
  unit_price:  number;
  total_price: number;
  image_url?:  string;
  product_id?: number;
  slug?:       string;
}

export interface EmailDeliveryAddress {
  full_name?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
}

export interface OrderEmailData {
  to: string;
  firstName: string;
  orderId?: number;
  orderNumber: string;
  orderDate: Date;
  items: OrderEmailItem[];
  subtotal: number;
  shipping: number;
  tax?: number;
  total: number;
  currency?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
  deliveryAddress?: EmailDeliveryAddress;
  trackingNumber?: string;
  note?: string;
}

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────

const cfg = () => ({
  storeName:    process.env.STORE_NAME        || 'Nalmart',
  momoNumber:   process.env.STORE_MOMO_NUMBER || '+256 700 000 000',
  supportEmail: process.env.SMTP_USER         || 'support@nalmart.com',
  fromEmail:    process.env.EMAIL_FROM        || process.env.SMTP_USER || 'noreply@nalmart.com',
  frontendUrl:  process.env.FRONTEND_URL      || 'https://nalmart.com',
});

const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER     || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  });

// ─────────────────────────────────────────────────────────────────
// Template loader
// ─────────────────────────────────────────────────────────────────

function tplDir(): string {
  const here = path.join(__dirname, '../templates/emails');
  if (fs.existsSync(here)) return here;
  return path.join(process.cwd(), 'src/templates/emails');
}

function loadTemplate(name: string): string {
  return fs.readFileSync(path.join(tplDir(), name), 'utf-8');
}

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

// ─────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'UGX') =>
  `${currency} ${Number(n).toLocaleString('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────
// HTML fragment builders
// ─────────────────────────────────────────────────────────────────

function buildItemsHtml(items: OrderEmailItem[], currency: string): string {
  const rows = items.map((item) => {
    const imgCell = item.image_url
      ? `<td style="width:56px;padding-right:14px;vertical-align:middle;"><img src="${item.image_url}" alt="${escHtml(item.name)}" width="56" height="56" style="width:56px;height:56px;object-fit:cover;border-radius:4px;border:1px solid #E5E7EB;display:block;"/></td>`
      : '';
    return `<tr><td style="padding:12px 0;border-bottom:1px solid #E5E7EB;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${imgCell}<td style="vertical-align:middle;"><div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${escHtml(item.name)}</div><div style="font-size:12px;color:#6B7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Qty ${item.quantity}&nbsp;&times;&nbsp;${fmt(item.unit_price, currency)}</div></td><td style="text-align:right;vertical-align:middle;white-space:nowrap;"><div style="font-size:14px;font-weight:700;color:#111827;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${fmt(item.total_price, currency)}</div></td></tr></table></td></tr>`;
  }).join('');
  return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#6B7280;font-weight:600;margin-bottom:14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Your Items</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`;
}

function buildPriceSummaryHtml(subtotal: number, shipping: number, tax: number, total: number, currency: string): string {
  const taxRow = tax > 0 ? `<tr><td style="font-size:13px;color:#6B7280;padding-bottom:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Tax</td><td style="font-size:13px;color:#111827;text-align:right;padding-bottom:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${fmt(tax, currency)}</td></tr>` : '';
  const shippingColor = shipping === 0 ? '#16A34A' : '#111827';
  const shippingText  = shipping === 0 ? 'Free' : fmt(shipping, currency);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;"><tr><td style="font-size:13px;color:#6B7280;padding-bottom:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Subtotal</td><td style="font-size:13px;color:#111827;text-align:right;padding-bottom:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${fmt(subtotal, currency)}</td></tr><tr><td style="font-size:13px;color:#6B7280;padding-bottom:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Delivery</td><td style="font-size:13px;color:${shippingColor};text-align:right;padding-bottom:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${shippingText}</td></tr>${taxRow}<tr><td colspan="2" style="padding:10px 0 0;"><div style="border-top:1px solid #E5E7EB;"></div></td></tr><tr><td style="font-size:15px;font-weight:700;color:#111827;padding-top:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Total</td><td style="font-size:18px;font-weight:800;color:#F97316;text-align:right;padding-top:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${fmt(total, currency)}</td></tr></table>`;
}

function buildCodHtml(total: number, orderNumber: string, currency: string, momoNumber: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="border:1px solid #E5E7EB;border-left:3px solid #F97316;padding:18px 20px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#F97316;font-weight:600;margin-bottom:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Payment at Delivery</div><div style="font-size:22px;font-weight:800;color:#111827;margin-bottom:8px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${fmt(total, currency)}</div><div style="font-size:13px;color:#6B7280;line-height:1.6;margin-bottom:14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Please have this amount ready — cash or Mobile Money.</div><div style="border-top:1px solid #E5E7EB;padding-top:12px;"><div style="font-size:13px;color:#111827;margin-bottom:4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"><strong>MTN MoMo</strong> (*165#) &nbsp;|&nbsp; <strong>Airtel Money</strong> (*185#)</div><div style="font-size:15px;font-weight:700;color:#111827;letter-spacing:0.5px;margin-bottom:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${momoNumber}</div><div style="font-size:12px;color:#6B7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Use <strong>#${escHtml(orderNumber)}</strong> as your MoMo payment reference</div></div></td></tr></table>`;
}

function buildDeliveryHtml(address: EmailDeliveryAddress | undefined, method: string | undefined): string {
  if (!address && !method) return '';
  const lines: string[] = [];
  if (address) {
    [address.full_name, address.address_line_1, address.address_line_2,
      [address.city, address.state].filter(Boolean).join(', '), address.country, address.phone]
      .filter(Boolean).forEach((l) => lines.push(escHtml(l as string)));
  }
  const methodRow  = method  ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;font-weight:600;margin-bottom:4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Delivery Method</div><div style="font-size:14px;color:#111827;margin-bottom:14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${escHtml(method)}</div>` : '';
  const addrBlock  = lines.length ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;font-weight:600;margin-bottom:4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Delivery Address</div><div style="font-size:14px;color:#111827;line-height:1.7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${lines.join('<br/>')}</div>` : '';
  return `<div style="height:24px;"></div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#6B7280;font-weight:600;margin-bottom:14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Delivery Details</div>${methodRow}${addrBlock}`;
}

function buildTrackingHtml(trackingNumber: string | undefined): string {
  if (!trackingNumber) return '';
  return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#6B7280;font-weight:600;margin-bottom:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Tracking Number</div><div style="font-size:20px;font-weight:700;color:#111827;letter-spacing:1px;margin-bottom:28px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${escHtml(trackingNumber)}</div>`;
}

function buildPaymentReminderHtml(total: number, orderNumber: string, currency: string, momoNumber: string): string {
  return `<div style="height:24px;"></div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#6B7280;font-weight:600;margin-bottom:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Payment Reminder</div><p style="font-size:13px;color:#111827;margin:0;line-height:1.7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Have <strong>${fmt(total, currency)}</strong> ready at delivery — cash or Mobile Money to <strong>${escHtml(momoNumber)}</strong> (ref: #${escHtml(orderNumber)}).</p>`;
}

function buildReviewRowsHtml(items: OrderEmailItem[], orderNumber: string, frontendUrl: string): string {
  return items.map((item) => {
    const productPath = item.slug ? `/product/${item.slug}` : `/product/${item.product_id}`;
    const reviewUrl   = `${frontendUrl}${productPath}?review=1&order=${encodeURIComponent(orderNumber)}`;
    const imgCell     = item.image_url ? `<td style="width:56px;padding-right:14px;vertical-align:middle;"><img src="${item.image_url}" alt="${escHtml(item.name)}" width="56" height="56" style="width:56px;height:56px;object-fit:cover;border-radius:4px;border:1px solid #E5E7EB;display:block;"/></td>` : '';
    return `<tr><td style="padding:12px 0;border-bottom:1px solid #E5E7EB;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${imgCell}<td style="vertical-align:middle;"><div style="font-size:13px;font-weight:600;color:#111827;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${escHtml(item.name)}</div><div style="font-size:12px;color:#6B7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Qty ${item.quantity}</div></td><td style="text-align:right;vertical-align:middle;"><a href="${reviewUrl}" style="display:inline-block;border:1px solid #F97316;color:#F97316;font-size:12px;font-weight:600;text-decoration:none;padding:6px 14px;border-radius:4px;white-space:nowrap;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Rate Item</a></td></tr></table></td></tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────
// Plain-text fallback
// ─────────────────────────────────────────────────────────────────

function buildPlainText(subjectLine: string, d: OrderEmailData): string {
  const currency = d.currency || 'UGX';
  const { momoNumber, storeName } = cfg();
  const lines: string[] = [
    `Hi ${d.firstName},`, '', subjectLine, '',
    `Order: #${d.orderNumber}  |  ${fmtDate(d.orderDate)}`,
    '─────────────────────────────────────',
    ...d.items.map((i) => `  ${i.name}  x${i.quantity}  —  ${fmt(i.total_price, currency)}`),
    '',
    `Subtotal:  ${fmt(d.subtotal, currency)}`,
    `Delivery:  ${d.shipping === 0 ? 'Free' : fmt(d.shipping, currency)}`,
    `Total:     ${fmt(d.total, currency)}`,
    '',
  ];
  if (d.deliveryAddress) {
    const a = d.deliveryAddress;
    lines.push('Delivery Address:');
    [a.full_name, a.address_line_1, [a.city, a.state].filter(Boolean).join(', '), a.country, a.phone]
      .filter(Boolean).forEach((l) => lines.push(`  ${l}`));
    lines.push('');
  }
  lines.push(`Payment: Cash on Delivery — ${fmt(d.total, currency)}`);
  lines.push(`MoMo: ${momoNumber} — ref: #${d.orderNumber}`);
  lines.push('');
  lines.push(`– The ${storeName} Team`);
  lines.push('Nalmart · A product of Nalmart Holdings Co Ltd');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// Internal send
// ─────────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const { storeName, fromEmail } = cfg();
  try {
    const transporter = createTransporter();
    await transporter.sendMail({ from: `"${storeName}" <${fromEmail}>`, to, subject, html, text });
    logger.info(`Email sent → ${to} | ${subject}`);
  } catch (err) {
    logger.error(`Email failed → ${to} | ${subject}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

export class EmailService {
  static async sendOrderReceived(d: OrderEmailData): Promise<void> {
    const { momoNumber, supportEmail, frontendUrl, storeName } = cfg();
    const currency = d.currency || 'UGX';
    const orderUrl = `${frontendUrl}/orders?order=${encodeURIComponent(d.orderNumber)}`;
    const html = render(loadTemplate('order-received.html'), {
      HERO_TITLE:         `Order received, ${d.firstName}.`,
      HERO_SUBTITLE:      'We have your order and will confirm it shortly. No payment is needed right now — our rider will collect at your door.',
      ORDER_NUMBER:       d.orderNumber,
      ORDER_DATE:         fmtDate(d.orderDate),
      STATUS_LABEL:       'Pending Confirmation',
      ITEMS_HTML:         buildItemsHtml(d.items, currency),
      PRICE_SUMMARY_HTML: buildPriceSummaryHtml(d.subtotal, d.shipping, d.tax || 0, d.total, currency),
      DELIVERY_HTML:      buildDeliveryHtml(d.deliveryAddress, d.deliveryMethod),
      CTA_URL:            orderUrl,
      CTA_LABEL:          'View My Order',
      SUPPORT_EMAIL:      supportEmail,
      FRONTEND_URL:       frontendUrl,
      STORE_NAME:         storeName,
      YEAR:               String(new Date().getFullYear()),
    });
    await send(d.to, `Order Received — #${d.orderNumber}`, html,
      buildPlainText('Your order has been received.', d));
  }

  static async sendOrderConfirmed(d: OrderEmailData): Promise<void> {
    const { momoNumber, supportEmail, frontendUrl, storeName } = cfg();
    const currency = d.currency || 'UGX';
    const orderUrl = `${frontendUrl}/orders?order=${encodeURIComponent(d.orderNumber)}`;
    const html = render(loadTemplate('order-confirmed.html'), {
      HERO_TITLE:         `Order confirmed, ${d.firstName}.`,
      HERO_SUBTITLE:      'Your order is confirmed and is now being packed. Please have your payment ready when our rider arrives.',
      ORDER_NUMBER:       d.orderNumber,
      ORDER_DATE:         fmtDate(d.orderDate),
      STATUS_LABEL:       'Confirmed',
      ITEMS_HTML:         buildItemsHtml(d.items, currency),
      PRICE_SUMMARY_HTML: buildPriceSummaryHtml(d.subtotal, d.shipping, d.tax || 0, d.total, currency),
      COD_HTML:           buildCodHtml(d.total, d.orderNumber, currency, momoNumber),
      DELIVERY_HTML:      buildDeliveryHtml(d.deliveryAddress, d.deliveryMethod),
      CTA_URL:            orderUrl,
      CTA_LABEL:          'View Order Details',
      SUPPORT_EMAIL:      supportEmail,
      FRONTEND_URL:       frontendUrl,
      STORE_NAME:         storeName,
      YEAR:               String(new Date().getFullYear()),
    });
    await send(d.to, `Order Confirmed — #${d.orderNumber}`, html,
      buildPlainText('Your order is confirmed. Have your payment ready.', d));
  }

  static async sendOrderShipped(d: OrderEmailData): Promise<void> {
    const { momoNumber, supportEmail, frontendUrl, storeName } = cfg();
    const currency = d.currency || 'UGX';
    const orderUrl = `${frontendUrl}/orders?order=${encodeURIComponent(d.orderNumber)}`;
    const html = render(loadTemplate('order-shipped.html'), {
      HERO_TITLE:            `Your order is on its way, ${d.firstName}.`,
      HERO_SUBTITLE:         'Our rider has collected your order and is heading to your delivery address.',
      ORDER_NUMBER:          d.orderNumber,
      ORDER_DATE:            fmtDate(d.orderDate),
      STATUS_LABEL:          'Shipped',
      TRACKING_HTML:         buildTrackingHtml(d.trackingNumber),
      ITEMS_HTML:            buildItemsHtml(d.items, currency),
      PRICE_SUMMARY_HTML:    buildPriceSummaryHtml(d.subtotal, d.shipping, d.tax || 0, d.total, currency),
      DELIVERY_HTML:         buildDeliveryHtml(d.deliveryAddress, d.deliveryMethod),
      PAYMENT_REMINDER_HTML: buildPaymentReminderHtml(d.total, d.orderNumber, currency, momoNumber),
      CTA_URL:               orderUrl,
      CTA_LABEL:             'Track My Order',
      SUPPORT_EMAIL:         supportEmail,
      FRONTEND_URL:          frontendUrl,
      STORE_NAME:            storeName,
      YEAR:                  String(new Date().getFullYear()),
    });
    await send(d.to, `Your order #${d.orderNumber} is on its way`, html,
      buildPlainText('Your order has been shipped.', d));
  }

  static async sendOutForDelivery(d: OrderEmailData): Promise<void> {
    const { momoNumber, supportEmail, frontendUrl, storeName } = cfg();
    const currency = d.currency || 'UGX';
    const orderUrl = `${frontendUrl}/orders?order=${encodeURIComponent(d.orderNumber)}`;
    const html = render(loadTemplate('out-for-delivery.html'), {
      HERO_TITLE:    `Your order is almost there, ${d.firstName}.`,
      HERO_SUBTITLE: 'Our rider is on the way to your address right now. Please ensure someone is available to receive the delivery.',
      ORDER_NUMBER:  d.orderNumber,
      ORDER_DATE:    fmtDate(d.orderDate),
      STATUS_LABEL:  'Out for Delivery',
      COD_HTML:      buildCodHtml(d.total, d.orderNumber, currency, momoNumber),
      DELIVERY_HTML: buildDeliveryHtml(d.deliveryAddress, d.deliveryMethod),
      CTA_URL:       orderUrl,
      CTA_LABEL:     'View Order',
      SUPPORT_EMAIL: supportEmail,
      FRONTEND_URL:  frontendUrl,
      STORE_NAME:    storeName,
      YEAR:          String(new Date().getFullYear()),
    });
    await send(d.to, `#${d.orderNumber} — Rider is on the way`, html,
      buildPlainText('Your order is out for delivery.', d));
  }

  static async sendDelivered(d: OrderEmailData): Promise<void> {
    const { supportEmail, frontendUrl, storeName } = cfg();
    const reorderUrl   = `${frontendUrl}/orders?order=${encodeURIComponent(d.orderNumber)}&reorder=1`;
    const rateDelivery = `${frontendUrl}/orders?order=${encodeURIComponent(d.orderNumber)}&rate_delivery=1`;
    const html = render(loadTemplate('delivered.html'), {
      HERO_TITLE:        `Delivered! Thank you, ${d.firstName}.`,
      HERO_SUBTITLE:     'Your order has arrived. We hope you love your purchase. Please take a moment to share your experience.',
      ORDER_NUMBER:      d.orderNumber,
      ORDER_DATE:        fmtDate(d.orderDate),
      STATUS_LABEL:      'Delivered',
      REVIEW_ROWS_HTML:  buildReviewRowsHtml(d.items, d.orderNumber, frontendUrl),
      RATE_DELIVERY_URL: rateDelivery,
      CTA_URL:           reorderUrl,
      CTA_LABEL:         'Order Again',
      SUPPORT_EMAIL:     supportEmail,
      FRONTEND_URL:      frontendUrl,
      STORE_NAME:        storeName,
      YEAR:              String(new Date().getFullYear()),
    });
    await send(d.to, `Delivered — How did we do? #${d.orderNumber}`, html,
      buildPlainText('Your order has been delivered.', d));
  }

  /** Legacy alias */
  static async sendOrderConfirmation(d: OrderEmailData): Promise<void> {
    return this.sendOrderConfirmed(d);
  }

  static async sendRaw(opts: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    await send(opts.to, opts.subject, opts.html, opts.text || '');
  }
}

export type { OrderEmailData as OrderConfirmationData };
