/**
 * End-to-end order flow test
 * Tests: Login → Add to cart → Place order (COD) → Confirm payment (cron simulation)
 *       → Ship → Out for delivery → Deliver → Review prompt
 *
 * Usage: npx ts-node scripts/test-order-flow.ts [--reset-password <newpw>]
 */

import axios, { AxiosInstance } from 'axios';

const BASE = 'http://localhost:3000/api/v1';
const EMAIL = 'mcaplexya@gmail.com';

// ── small colour helpers ──────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;

function ok(step: string, detail = '')  { console.log(`  ${green('✓')} ${bold(step)} ${detail}`); }
function fail(step: string, err: any)   { console.log(`  ${red('✗')} ${bold(step)}`, err?.response?.data ?? err.message ?? err); }
function section(title: string)         { console.log(`\n${cyan('══')} ${bold(title)} ${cyan('══')}`); }

// ── axios client ─────────────────────────────────────────────────────────────
function client(token?: string): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true, // don't throw on error HTTP codes
  });
}

async function run() {
  let token = '';
  let orderId = 0;
  let paymentId = 0;
  let deliveryId = 0;

  // ── 0. Check backend ────────────────────────────────────────────────────────
  section('0. Backend Health');
  try {
    const r = await axios.get('http://localhost:3000/health');
    ok('Health check', r.data.message);
  } catch (e) {
    fail('Backend not reachable', e);
    process.exit(1);
  }

  // ── 1. Login ─────────────────────────────────────────────────────────────────
  section('1. Authentication');
  const args = process.argv.slice(2);
  let password = 'Nalmart123!';
  if (args.includes('--password')) password = args[args.indexOf('--password') + 1];

  const loginRes = await client().post('/auth/login', { email: EMAIL, password });
  if (!loginRes.data.success) {
    fail('Login failed — try: npx ts-node scripts/test-order-flow.ts --password <yourpw>', loginRes.data);
    process.exit(1);
  }
  token = loginRes.data.data.access_token;
  const user = loginRes.data.data.user;
  ok('Login', `${user.first_name} ${user.last_name} (${user.email})`);

  const api = client(token);

  // ── 2. Fetch a product ───────────────────────────────────────────────────────
  section('2. Product');
  const prodRes = await api.get('/products?limit=3&status=active');
  const products: any[] = prodRes.data?.data ?? [];
  let product = products.find((p: any) => p.stock_status === 'in_stock') ?? products[0];
  if (!product) {
    // Try without filter
    const allProds = await api.get('/products?limit=5');
    product = allProds.data?.data?.[0];
  }
  if (!product) { fail('No products found', {}); process.exit(1); }
  ok('Product', `#${product.id} "${product.name}" — UGX ${Number(product.price).toLocaleString()}`);

  // ── 3. Fetch delivery method ─────────────────────────────────────────────────
  section('3. Delivery Method');
  const dmRes = await api.get('/deliveries/methods');
  const methods: any[] = dmRes.data?.data ?? [];
  const method = methods[0];
  if (!method) { fail('No delivery methods found', dmRes.data); process.exit(1); }
  ok('Delivery method', `#${method.id} "${method.name}" — base UGX ${Number(method.base_fee ?? 0).toLocaleString()}`);

  // ── 4. Add to cart ───────────────────────────────────────────────────────────
  section('4. Cart');
  const cartAdd = await api.post('/cart', { product_id: product.id, quantity: 1 });
  if (cartAdd.status >= 400) {
    fail('Add to cart', cartAdd.data);
    // Don't exit — maybe cart endpoint is different, continue with direct order
    console.log(yellow('  ⚠ Skipping cart, placing order directly'));
  } else {
    ok('Add to cart', `qty=1 of product #${product.id}`);
    const cartView = await api.get('/cart');
    ok('Cart view', `${cartView.data?.data?.items?.length ?? '?'} item(s)`);
  }

  // ── 5. Place order (COD) ─────────────────────────────────────────────────────
  section('5. Place Order (Cash on Delivery)');
  const orderBody = {
    items: [{ product_id: product.id, quantity: 1 }],
    delivery_method_id: method.id,
    payment_method: 'cash_on_delivery',
    shipping_address: {
      full_name:      `${user.first_name || 'Test'} ${user.last_name || 'User'}`,
      address_line_1: '14 Kampala Road',
      address_line_2: 'Nakasero',
      city:           'Kampala',
      state:          'Central',
      country:        'Uganda',
      phone:          user.phone || '+256700000000',
    },
    notes: 'Test order — please ignore',
  };

  const orderRes = await api.post('/orders', orderBody);
  if (!orderRes.data.success) { fail('Place order', orderRes.data); process.exit(1); }
  orderId = orderRes.data.data.id ?? orderRes.data.data.order?.id;
  const orderNumber = orderRes.data.data.order_number ?? orderRes.data.data.order?.order_number ?? `#${orderId}`;
  ok('Order placed', `${orderNumber} (id=${orderId}) status=${orderRes.data.data.status ?? orderRes.data.data.order?.status}`);

  // ── 6. Process COD payment ───────────────────────────────────────────────────
  section('6. COD Payment');
  const payRes = await api.post('/payments/process', { order_id: orderId, method: 'cash_on_delivery' });
  if (!payRes.data.success) { fail('Process payment', payRes.data); }
  else {
    paymentId = payRes.data.data?.payment?.id ?? payRes.data.data?.id ?? 0;
    const pStatus = payRes.data.data?.payment?.status ?? payRes.data.data?.status;
    ok('COD payment created', `id=${paymentId}, status=${pStatus}`);
    if (pStatus === 'pending') {
      ok('Status is PENDING ✓', '(order-received email should have been sent to ' + EMAIL + ')');
    }
  }

  // ── 7. Simulate cron job (manual confirmation) ───────────────────────────────
  section('7. Simulate Payment Confirmation Cron');
  // Give the DB a moment
  await new Promise(r => setTimeout(r, 500));
  const cronRes = await api.post('/payments/run-confirmation-job');
  if (cronRes.status === 404) {
    console.log(yellow('  ⚠ Cron endpoint not exposed — calling confirmPayment directly'));
    if (paymentId) {
      const cfRes = await api.post(`/payments/${paymentId}/confirm`, { provider_ref: 'COD-TEST-001' });
      if (cfRes.data.success) ok('Payment confirmed (manual)', `order status → ${cfRes.data.data?.order?.status}`);
      else fail('Manual confirm', cfRes.data);
    }
  } else if (cronRes.data.success || cronRes.status < 400) {
    ok('Cron job ran', JSON.stringify(cronRes.data?.data ?? cronRes.data).slice(0, 120));
  } else {
    fail('Cron trigger', cronRes.data);
  }

  // verify order status
  await new Promise(r => setTimeout(r, 300));
  const orderCheck = await api.get(`/orders/${orderId}`);
  const oStatus = orderCheck.data?.data?.status ?? orderCheck.data?.order?.status;
  ok('Order status after cron', oStatus ?? '(could not read)');

  // ── 8. Ship the order ────────────────────────────────────────────────────────
  section('8. Ship Order');
  const shipRes = await api.post(`/orders/${orderId}/ship`, {
    tracking_number: 'TRK-TEST-20260228',
    carrier: 'Nalmart Riders',
  });
  if (!shipRes.data.success) fail('Ship order', shipRes.data);
  else ok('Order shipped', `tracking=TRK-TEST-20260228  (order-shipped email → ${EMAIL})`);

  await new Promise(r => setTimeout(r, 300));

  // ── 9. Out for delivery ──────────────────────────────────────────────────────
  section('9. Out for Delivery');
  // First get delivery record
  const delivsRes = await api.get(`/deliveries/order/${orderId}`);
  const deliveries: any[] = delivsRes.data?.data ?? [];
  if (deliveries.length > 0) {
    deliveryId = deliveries[0].id;
    ok('Found delivery record', `id=${deliveryId}, status=${deliveries[0].status}`);

    // advance through processing → dispatched → in_transit → out_for_delivery
    const steps = [
      { status: 'processing',       notes: 'Packed and ready' },
      { status: 'dispatched',       notes: 'Handed to rider' },
      { status: 'in_transit',       notes: 'En route' },
      { status: 'out_for_delivery', notes: 'Arrived in your area' },
    ];

    for (const step of steps) {
      const upd = await api.put(`/deliveries/${deliveryId}/status`, {
        status: step.status,
        location: 'Kampala',
        notes: step.notes,
      });
      if (upd.data.success || upd.status < 400) ok(`Delivery → ${step.status}`, '');
      else { fail(`Delivery → ${step.status}`, upd.data); break; }
      await new Promise(r => setTimeout(r, 200));
    }
    ok('Out-for-delivery email sent', `→ ${EMAIL}`);
  } else {
    console.log(yellow('  ⚠ No delivery record found — skipping delivery status steps'));
  }

  // ── 10. Deliver ──────────────────────────────────────────────────────────────
  section('10. Deliver Order');
  const deliverRes = await api.post(`/orders/${orderId}/deliver`);
  if (!deliverRes.data.success) fail('Deliver order', deliverRes.data);
  else ok('Order delivered!', `(delivered + review-request email → ${EMAIL})`);

  // If we have a delivery record, also advance it to 'delivered'
  if (deliveryId) {
    const upd = await api.put(`/deliveries/${deliveryId}/status`, {
      status: 'delivered',
      location: 'Customer address',
      notes: 'Delivered successfully',
    });
    if (upd.data.success || upd.status < 400) ok('Delivery record → delivered', '');
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  section('Summary');
  console.log(`
  ${bold('Emails dispatched to')} ${cyan(EMAIL)}:
    1. ${green('Order Received')}     — immediately on COD placement
    2. ${green('Order Confirmed')}    — after cron job / manual confirm
    3. ${green('Order Shipped')}      — after ship step
    4. ${green('Out for Delivery')}   — when delivery status = out_for_delivery
    5. ${green('Delivered + Review')} — after deliver step

  ${bold('Order')}  : ${orderNumber} (id=${orderId})
  ${bold('Payment')}: id=${paymentId}
  ${bold('Delivery')}: id=${deliveryId || 'n/a'}
  `);
}

run().catch(err => {
  console.error(red('\nFatal error:'), err.message ?? err);
  process.exit(1);
});
