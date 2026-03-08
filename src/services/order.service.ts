import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import ProductImage from '../models/ProductImage';
import User from '../models/User';
import ReservedInventory from '../models/ReservedInventory';
import Inventory from '../models/Inventory';
import { InventoryService } from './inventory.service';
import DeliveryService from './delivery.service';
import { EmailService } from './email.service';
import { WarehouseService } from './warehouse.service';
import PushService from './push.service';
import logger from '../utils/logger';
import { NotFoundError, BadRequestError, ValidationError } from '../utils/errors';
import { Op } from 'sequelize';

interface CreateOrderInput {
  user_id: number;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price?: number;
  }>;
  delivery_method_id?: number;
  delivery_address_id?: number;
  coupon_code?: string;
  payment_method?: string;
  shipping_address?: Record<string, any>;
  billing_address?: Record<string, any>;
  customer_notes?: string;
  ip_address?: string;
  user_agent?: string;
}

interface UpdateOrderInput {
  payment_method?: string;
  payment_transaction_id?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  shipped_at?: Date;
  delivered_at?: Date;
  cancelled_at?: Date;
  confirmed_at?: Date;
  processed_at?: Date;
  picked_at?: Date;
  packed_at?: Date;
  in_transit_at?: Date;
  out_for_delivery_at?: Date;
  admin_notes?: string;
}

export class OrderService {
  /**
   * Generate unique order number (10-digit)
   */
  static generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString();
    const orderNumber = (timestamp + random).slice(-10);
    return orderNumber;
  }

  /**
   * Create a new order
   */
  static async createOrder(data: CreateOrderInput): Promise<Order> {
    try {
      // Validate user exists
      const user = await User.findByPk(data.user_id);
      if (!user) throw new NotFoundError(`User with ID ${data.user_id} not found`);

      // Validate items
      if (!data.items || data.items.length === 0) {
        throw new BadRequestError('Order must contain at least one item');
      }

      // Verify and fetch products (include images for snapshot)
      const products = await Product.findAll({
        where: { id: data.items.map((item) => item.product_id) },
        include: [{ model: ProductImage, limit: 1, order: [['is_primary', 'DESC'], ['id', 'ASC']] }],
      });

      if (products.length !== data.items.length) {
        throw new BadRequestError('One or more products not found');
      }

      // Calculate totals
      let subtotal = 0;
      let totalWeight = 0;
      const itemsData: Array<{
        order_id?: number;
        product_id: number;
        product_name: string;
        product_sku: string;
        product_image_url: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }> = [];

      for (const item of data.items) {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) throw new NotFoundError(`Product ${item.product_id} not found`);

        // Check stock availability - try inventory table first, fallback to product.stock_quantity
        let availableStock = product.stock_quantity || 0;
        
        const inventory = await Inventory.findOne({
          where: { product_id: item.product_id },
        });

        if (inventory && inventory.quantity_available) {
          availableStock = inventory.quantity_available;
        }

        if (availableStock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for product: ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`
          );
        }

        const unitPrice = item.unit_price || product.price;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        totalWeight += (product.weight || 0) * item.quantity;

        itemsData.push({
          product_id: item.product_id,
          product_name: product.name,
          product_sku: product.sku || '',
          product_image_url: (product as any).images?.[0]?.url ?? '',
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        });
      }

      // Tax is zero — not charged
      const taxAmount = 0;

      // Calculate shipping amount using delivery quote engine (store distance + campaigns)
      let shippingAmount = 0;
      try {
        const quote = await DeliveryService.quoteDeliveryFee({
          user_id: data.user_id,
          items: data.items.map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
          })),
          delivery_address_id: data.delivery_address_id,
          shipping_address: data.shipping_address,
        });
        shippingAmount = Number(quote?.shipping_fee || 0);
      } catch (quoteError) {
        logger.warn(`Delivery quote failed for order creation, falling back to method fee: ${(quoteError as any)?.message}`);

        if (data.delivery_method_id) {
          shippingAmount = await DeliveryService.calculateShippingFee(
            data.delivery_method_id,
            totalWeight,
            subtotal
          );
        } else {
          const availableMethods = await DeliveryService.getAvailableMethods();
          if (availableMethods.length > 0) {
            shippingAmount = await DeliveryService.calculateShippingFee(
              availableMethods[0].id,
              totalWeight,
              subtotal
            );
          } else {
            logger.warn('No delivery methods found in DB — using 0 shipping fee as fallback');
            shippingAmount = 0;
          }
        }
      }

      const discountAmount = 0; // TODO: Apply coupon logic
      const totalAmount = Number((subtotal + taxAmount + shippingAmount - discountAmount).toFixed(2));

      // Create order
      const orderNumber = this.generateOrderNumber();
      const order = await Order.create({
        order_number: orderNumber,
        user_id: data.user_id,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_status: 'pending',
        subtotal,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        coupon_code: data.coupon_code,
        payment_method: data.payment_method,
        shipping_address: data.shipping_address,
        billing_address: data.billing_address,
        customer_notes: data.customer_notes,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
      });

      // Create order items
      for (const item of itemsData) {
        await OrderItem.create({
          order_id: order.id,
          ...item,
        });

        // Reserve inventory — convert any existing cart reservation, else create a new order reservation
        const inventory = await Inventory.findOne({
          where: { product_id: item.product_id },
        });

        if (inventory) {
          // Look for an existing pending cart reservation from this user for this inventory
          const cartReservation = await ReservedInventory.findOne({
            where: {
              inventory_id: inventory.id,
              reserved_by: data.user_id,
              reservation_type: 'cart',
              status: 'pending',
            },
          });

          if (cartReservation) {
            // Convert cart reservation → order reservation (no double-counting)
            cartReservation.order_id = order.id;
            cartReservation.cart_id = null;
            cartReservation.reservation_type = 'order';
            cartReservation.status = 'allocated';
            cartReservation.reserved_price = item.unit_price;
            cartReservation.allocated_at = new Date();
            // Adjust quantity if different (edge case: qty changed at checkout)
            const qtyDiff = item.quantity - cartReservation.quantity_reserved;
            if (qtyDiff !== 0) {
              inventory.quantity_reserved += qtyDiff;
              inventory.quantity_available = inventory.quantity_on_hand - inventory.quantity_reserved;
              await inventory.save();
              cartReservation.quantity_reserved = item.quantity;
            }
            await cartReservation.save();
          } else {
            // No cart reservation — create a fresh order reservation
            await InventoryService.reserveInventory(
              inventory.id,
              order.id,
              item.quantity,
              data.user_id,
              item.unit_price
            );
          }
        }
      }

      // Create delivery if address provided
      if (data.delivery_address_id) {
        try {
          // Resolve delivery method: use provided id, or fall back to the first active method in DB
          let deliveryMethodId = data.delivery_method_id;
          if (!deliveryMethodId) {
            const activeMethods = await DeliveryService.getAvailableMethods();
            deliveryMethodId = activeMethods[0]?.id;
          }
          if (!deliveryMethodId) {
            logger.warn(`No active delivery method found — skipping delivery record for order ${order.id}`);
          } else {
            await DeliveryService.createDelivery({
              order_id: order.id,
              delivery_method_id: deliveryMethodId,
              delivery_address_id: data.delivery_address_id,
              total_weight: totalWeight,
            });
          }
        } catch (deliveryErr) {
          // Delivery record creation failure must not roll back the order itself
          logger.warn(`Delivery record creation failed for order ${order.id}: ${(deliveryErr as any)?.message}`);
        }
      }

      logger.info(`✅ Order created: ${orderNumber}`);

      // Fire order-received confirmation email (non-blocking)
      OrderService.sendStatusEmail(order.id, 'received').catch(() => {});

      // Push: alert all admins about the new order
      PushService.onNewOrder({
        orderId:      order.id,
        orderNumber:  order.order_number,
        customerName: `User #${order.user_id}`,
        total:        Number(order.total_amount),
        currency:     'UGX',
      }).catch(() => {});

      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID with items
   */
  static async getOrderById(orderId: number): Promise<Order | null> {
    try {
      return await Order.findByPk(orderId, {
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
          },
          {
            model: OrderItem,
            include: [
              {
                model: Product,
                attributes: ['id', 'name', 'sku', 'image_url'],
              },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error('Error fetching order:', error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    try {
      return await Order.findOne({
        where: { order_number: orderNumber },
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
          },
          {
            model: OrderItem,
            include: [
              {
                model: Product,
                attributes: ['id', 'name', 'sku', 'image_url'],
              },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error('Error fetching order:', error);
      throw error;
    }
  }

  /**
   * Get orders for a user
   */
  static async getUserOrders(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ data: Order[]; count: number }> {
    try {
      const { count, rows } = await Order.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: OrderItem,
            attributes: ['product_id', 'product_name', 'product_image_url', 'quantity', 'unit_price', 'total_price'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return { data: rows, count };
    } catch (error) {
      logger.error('Error fetching user orders:', error);
      throw error;
    }
  }

  /**
   * Get all orders with filters
   */
  static async getOrders(query: any = {}): Promise<{ data: Order[]; count: number; pagination: any }> {
    try {
      const limit = parseInt(query.limit) || 20;
      const offset = parseInt(query.offset) || 0;
      const status = query.status;
      const paymentStatus = query.paymentStatus;
      const fulfillmentStatus = query.fulfillmentStatus;
      const dateFrom = query.dateFrom;
      const dateTo = query.dateTo;

      const where: any = {};

      if (status) {
        // Match orders by status OR by fulfillment_status mapping (handles legacy orders)
        const fulfillmentEquiv: Record<string, string[]> = {
          processing: ['processing', 'picked', 'packed'],
          shipped:    ['shipped', 'in_transit', 'out_for_delivery'],
          delivered:  ['delivered'],
        };
        const equiv = fulfillmentEquiv[status];
        if (equiv) {
          where[Op.or] = [
            { status },
            { fulfillment_status: { [Op.in]: equiv } },
          ];
        } else {
          where.status = status;
        }
      }
      if (paymentStatus) where.payment_status = paymentStatus;
      if (fulfillmentStatus) where.fulfillment_status = fulfillmentStatus;

      if (dateFrom || dateTo) {
        where.created_at = {};
        if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
        if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
      }

      const { count, rows } = await Order.findAndCountAll({
        where,
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
          {
            model: OrderItem,
            attributes: ['id', 'product_id', 'product_name', 'product_sku', 'product_image_url', 'quantity', 'unit_price', 'total_price'],
          },
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return {
        data: rows,
        count,
        pagination: {
          limit,
          offset,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Update order
   */
  static async updateOrder(orderId: number, data: UpdateOrderInput): Promise<Order> {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) throw new NotFoundError('Order not found');

      const prevStatus = order.status;

      // Update fields
      if (data.status) order.status = data.status;
      if (data.payment_status) order.payment_status = data.payment_status;
      if (data.fulfillment_status) {
        order.fulfillment_status = data.fulfillment_status;
        // Auto-stamp the stage timestamp when first advancing to it
        const stageTimestampMap: Record<string, keyof Order> = {
          confirmed:        'confirmed_at',
          processing:       'processed_at',
          picked:           'picked_at',
          packed:           'packed_at',
          shipped:          'shipped_at',
          in_transit:       'in_transit_at',
          out_for_delivery: 'out_for_delivery_at',
          delivered:        'delivered_at',
          cancelled:        'cancelled_at',
        };
        const tsField = stageTimestampMap[data.fulfillment_status];
        if (tsField && !(order as any)[tsField]) {
          (order as any)[tsField] = new Date();
        }
      }
      if (data.payment_method) order.payment_method = data.payment_method;
      if (data.payment_transaction_id) order.payment_transaction_id = data.payment_transaction_id;
      if (data.tracking_number) order.tracking_number = data.tracking_number;
      if (data.shipping_carrier) order.shipping_carrier = data.shipping_carrier;
      // Allow explicit timestamp overrides
      if (data.shipped_at) order.shipped_at = data.shipped_at;
      if (data.delivered_at) order.delivered_at = data.delivered_at;
      if (data.cancelled_at) order.cancelled_at = data.cancelled_at;
      if (data.confirmed_at) order.confirmed_at = data.confirmed_at;
      if (data.processed_at) order.processed_at = data.processed_at;
      if (data.picked_at) order.picked_at = data.picked_at;
      if (data.packed_at) order.packed_at = data.packed_at;
      if (data.in_transit_at) order.in_transit_at = data.in_transit_at;
      if (data.out_for_delivery_at) order.out_for_delivery_at = data.out_for_delivery_at;
      if (data.admin_notes) order.admin_notes = data.admin_notes;

      await order.save();

      // Automatically create warehouse job when order becomes confirmed/processing
      const nowActive = ['confirmed', 'processing'].includes(order.status);
      const wasInactive = !['confirmed', 'processing', 'shipped', 'delivered'].includes(prevStatus);
      if (nowActive && wasInactive) {
        WarehouseService.createJob(orderId).catch((err) =>
          logger.warn(`[Warehouse] Could not create job for order ${orderId}: ${err?.message}`)
        );
      }

      // Fire a status-change email for every meaningful transition
      if (prevStatus !== order.status) {
        const statusEmailMap: Partial<Record<string, 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered'>> = {
          confirmed:        'confirmed',
          processing:       'processing',
          packed:           'packed',
          shipped:          'shipped',
          out_for_delivery: 'out_for_delivery',
          delivered:        'delivered',
        };
        const emailStatus = statusEmailMap[order.status];
        if (emailStatus) {
          OrderService.sendStatusEmail(orderId, emailStatus, order.tracking_number || undefined).catch(() => {});
        }
        // Push notification for every meaningful status transition
        PushService.onOrderStatusChanged({
          userId:      order.user_id,
          orderId:     order.id,
          orderNumber: order.order_number,
          status:      order.status,
          total:       Number(order.total_amount),
          currency:    'UGX',
        }).catch(() => {});
      }

      logger.info(`✅ Order updated: ${order.order_number}`);
      return order;
    } catch (error) {
      logger.error('Error updating order:', error);
      throw error;
    }
  }

  /**
   * Cancel order and release reserved inventory
   */
  static async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) throw new NotFoundError('Order not found');

      if (order.status === 'cancelled') {
        throw new BadRequestError('Order is already cancelled');
      }

      // Release reserved inventory
      const reservations = await ReservedInventory.findAll({
        where: { order_id: orderId, status: 'reserved' },
      });

      for (const reservation of reservations) {
        await InventoryService.unreserveInventory(reservation.id, reason || 'Order cancelled');
      }

      // Update order
      order.status = 'cancelled';
      order.fulfillment_status = 'cancelled';
      order.cancelled_at = new Date();
      if (reason) order.admin_notes = reason;

      await order.save();
      logger.info(`✅ Order cancelled: ${order.order_number}`);
      return order;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Mark order as shipped
   */
  static async shipOrder(
    orderId: number,
    trackingNumber?: string,
    carrier?: string
  ): Promise<Order> {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) throw new NotFoundError('Order not found');

      order.status = 'shipped';
      order.fulfillment_status = 'shipped';
      order.shipped_at = new Date();
      if (trackingNumber) order.tracking_number = trackingNumber;
      if (carrier) order.shipping_carrier = carrier;

      await order.save();
      logger.info(`✅ Order shipped: ${order.order_number}`);

      // Send shipping email (non-blocking)
      OrderService.sendStatusEmail(orderId, 'shipped', trackingNumber).catch(() => {});
      PushService.onOrderStatusChanged({
        userId: order.user_id, orderId: order.id, orderNumber: order.order_number,
        status: 'shipped', total: Number(order.total_amount), currency: 'UGX',
      }).catch(() => {});

      return order;
    } catch (error) {
      logger.error('Error shipping order:', error);
      throw error;
    }
  }

  /**
   * Mark order as delivered
   */
  static async deliverOrder(orderId: number): Promise<Order> {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) throw new NotFoundError('Order not found');

      order.status = 'delivered';
      order.fulfillment_status = 'delivered';
      order.delivered_at = new Date();

      await order.save();
      logger.info(`✅ Order delivered: ${order.order_number}`);

      // Send delivered + review-request email (non-blocking)
      OrderService.sendStatusEmail(orderId, 'delivered').catch(() => {});
      PushService.onOrderStatusChanged({
        userId: order.user_id, orderId: order.id, orderNumber: order.order_number,
        status: 'delivered', total: Number(order.total_amount), currency: 'UGX',
      }).catch(() => {});

      return order;
    } catch (error) {
      logger.error('Error delivering order:', error);
      throw error;
    }
  }

  /**
   * Record payment for order
   */
  static async recordPayment(
    orderId: number,
    transactionId: string,
    paymentMethod: string = 'card'
  ): Promise<Order> {
    try {
      const order = await Order.findByPk(orderId);
      if (!order) throw new NotFoundError('Order not found');

      order.status = 'confirmed';
      order.payment_status = 'paid';
      order.payment_transaction_id = transactionId;
      order.payment_method = paymentMethod;

      await order.save();

      // Trigger warehouse fulfilment pipeline
      WarehouseService.createJob(order.id).catch((err) =>
        logger.warn(`[Warehouse] Could not create job for order ${order.id}: ${err?.message}`)
      );

      logger.info(`✅ Payment recorded for order: ${order.order_number}`);

      // Fire order-confirmed email (non-blocking)
      OrderService.sendStatusEmail(order.id, 'confirmed').catch(() => {});
      PushService.onOrderStatusChanged({
        userId: order.user_id, orderId: order.id, orderNumber: order.order_number,
        status: 'confirmed', total: Number(order.total_amount), currency: 'UGX',
      }).catch(() => {});

      return order;
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(): Promise<any> {
    try {
      const totalOrders = await Order.count();
      const totalRevenue = await Order.sum('total_amount');
      const pendingOrders = await Order.count({ where: { status: 'pending' } });
      const shippedOrders = await Order.count({ where: { status: 'shipped' } });
      const deliveredOrders = await Order.count({ where: { status: 'delivered' } });
      const cancelledOrders = await Order.count({ where: { status: 'cancelled' } });

      const averageOrderValue = totalRevenue / totalOrders || 0;

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        byStatus: {
          pending: pendingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
      };
    } catch (error) {
      logger.error('Error fetching order stats:', error);
      throw error;
    }
  }

  // ── Status-update email helper ────────────────────────────────────────────

  /**
   * Load a fully-populated order and fire the appropriate status email.
   * Safe to call fire-and-forget (.catch(() => {})).
   */
  static async sendStatusEmail(
    orderId: number,
    status: 'received' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered',
    trackingNumber?: string,
  ): Promise<void> {
    try {
      const order = await Order.findByPk(orderId, {
        include: [
          { model: OrderItem },
          { model: User, attributes: ['id', 'email', 'first_name', 'last_name', 'phone'] },
        ],
      });
      if (!order) return;

      const user = (order as any).user as User | null;
      if (!user?.email) return;

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

      const base = {
        to:            user.email,
        firstName:     user.first_name || 'Customer',
        orderId:       order.id,
        orderNumber:   order.order_number,
        orderDate:     order.created_at,
        items,
        subtotal:      Number(order.subtotal),
        shipping:      Number(order.shipping_amount),
        tax:           0,
        total:         Number(order.total_amount),
        currency:      'UGX',
        paymentMethod: order.payment_method || 'cash_on_delivery',
        deliveryAddress,
        trackingNumber,
      };

      if      (status === 'received')          await EmailService.sendOrderReceived(base);
      else if (status === 'confirmed')          await EmailService.sendOrderConfirmed(base);
      else if (status === 'processing')         await EmailService.sendOrderProcessing(base);
      else if (status === 'packed')             await EmailService.sendOrderPacked(base);
      else if (status === 'shipped')            await EmailService.sendOrderShipped(base);
      else if (status === 'out_for_delivery')   await EmailService.sendOutForDelivery(base);
      else if (status === 'delivered')          await EmailService.sendDelivered(base);
    } catch (err) {
      logger.error(`sendStatusEmail error for order ${orderId}:`, err);
    }
  }
}

export default OrderService;
