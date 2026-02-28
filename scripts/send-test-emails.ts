/**
 * send-test-emails.ts
 * Sends all 5 order email templates to the test inbox.
 * Run: ts-node --project tsconfig.json scripts/send-test-emails.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { EmailService, OrderEmailData } from '../src/services/email.service';

const TO = 'mcaplexya@gmail.com';

const testData: OrderEmailData = {
  to:          TO,
  firstName:   'Chris',
  orderId:     42,
  orderNumber: 'NM-00042',
  orderDate:   new Date('2025-05-11T10:30:00'),
  currency:    'UGX',
  subtotal:    185000,
  shipping:    0,
  tax:         0,
  total:       185000,
  paymentMethod:  'cod',
  deliveryMethod: 'Standard Delivery',
  trackingNumber: 'TRK-2K5-9087',
  deliveryAddress: {
    full_name:      'Chris Nalmart',
    address_line_1: 'Plot 14, Kampala Road',
    city:           'Kampala',
    country:        'Uganda',
    phone:          '+256 700 123 456',
  },
  items: [
    {
      name:        'Apple iPhone 15 Pro (256 GB)',
      sku:         'IPH-15P-256',
      quantity:    1,
      unit_price:  135000,
      total_price: 135000,
      image_url:   'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692915070333',
      product_id:  1,
      slug:        'iphone-15-pro',
    },
    {
      name:        'Samsung Galaxy Buds2 Pro',
      sku:         'SAM-GBP2',
      quantity:    2,
      unit_price:  25000,
      total_price: 50000,
      image_url:   'https://images.samsung.com/is/image/samsung/p6pim/levant/2208/gallery/levant-galaxy-buds2-pro-r510-sm-r510nzaaxfe-533114066?$650_519_PNG$',
      product_id:  2,
      slug:        'samsung-galaxy-buds2-pro',
    },
  ],
};

async function main() {
  console.log(`\nSending test emails to ${TO} …\n`);

  const steps: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: '1/5  Order Received',       fn: () => EmailService.sendOrderReceived(testData) },
    { name: '2/5  Order Confirmed',      fn: () => EmailService.sendOrderConfirmed(testData) },
    { name: '3/5  Order Shipped',        fn: () => EmailService.sendOrderShipped(testData) },
    { name: '4/5  Out for Delivery',     fn: () => EmailService.sendOutForDelivery(testData) },
    { name: '5/5  Delivered',            fn: () => EmailService.sendDelivered(testData) },
  ];

  for (const step of steps) {
    process.stdout.write(`  ${step.name} … `);
    try {
      await step.fn();
      console.log('✓');
    } catch (err) {
      console.error('✗', err);
    }
    // small delay so Zoho doesn't rate-limit
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log('\nDone. Check your inbox at', TO, '\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
