import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import User from '../models/User';
import ReservedInventory from '../models/ReservedInventory';
import Inventory from '../models/Inventory';
import { InventoryService } from './inventory.service';
import DeliveryService from './delivery.service';
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
  shipping_address?: Record<string, string>;
  billing_address?: Record<string, string>;
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

      // Verify and fetch products
      const products = await Product.findAll({
        where: { id: data.items.map((item) => item.product_id) },
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

        // Check stock availability
        const inventory = await Inventory.findOne({
          where: { product_id: item.product_id },
        });

        if (!inventory || inventory.quantity_available < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for product: ${product.name}`
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
          product_image_url: '', // Will be fetched from ProductImage if needed
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        });
      }

      // Calculate tax (using simple 10% for now, can be made configurable per currency)
      const taxAmount = Number((subtotal * 0.1).toFixed(2));

      // Calculate shipping amount using delivery service
      let shippingAmount = 0;
      if (data.delivery_method_id) {
        shippingAmount = await DeliveryService.calculateShippingFee(
          data.delivery_method_id,
          totalWeight,
          subtotal
        );
      } else {
        // Default to first available method if not specified
        const availableMethods = await DeliveryService.getAvailableMethods();
        if (availableMethods.length > 0) {
          shippingAmount = await DeliveryService.calculateShippingFee(
            availableMethods[0].id,
            totalWeight,
            subtotal
          );
        } else {
          throw new BadRequestError('No delivery methods available');
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

        // Reserve inventory
        const inventory = await Inventory.findOne({
          where: { product_id: item.product_id },
        });

        if (inventory) {
          await InventoryService.reserveInventory(
            inventory.id,
            order.id,
            item.quantity,
            data.user_id,
            item.unit_price
          );
        }
      }

      // Create delivery if address provided
      if (data.delivery_address_id) {
        await DeliveryService.createDelivery({
          order_id: order.id,
          delivery_method_id: data.delivery_method_id || 1, // Use default method
          delivery_address_id: data.delivery_address_id,
          total_weight: totalWeight,
        });
      }

      logger.info(`✅ Order created: ${orderNumber}`);
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
            attributes: ['product_id', 'product_name', 'quantity', 'unit_price', 'total_price'],
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

      if (status) where.status = status;
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

      // Update fields
      if (data.status) order.status = data.status;
      if (data.payment_status) order.payment_status = data.payment_status;
      if (data.fulfillment_status) order.fulfillment_status = data.fulfillment_status;
      if (data.payment_method) order.payment_method = data.payment_method;
      if (data.payment_transaction_id) order.payment_transaction_id = data.payment_transaction_id;
      if (data.tracking_number) order.tracking_number = data.tracking_number;
      if (data.shipping_carrier) order.shipping_carrier = data.shipping_carrier;
      if (data.shipped_at) order.shipped_at = data.shipped_at;
      if (data.delivered_at) order.delivered_at = data.delivered_at;
      if (data.cancelled_at) order.cancelled_at = data.cancelled_at;
      if (data.admin_notes) order.admin_notes = data.admin_notes;

      await order.save();
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
      logger.info(`✅ Payment recorded for order: ${order.order_number}`);
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
}

export default OrderService;
