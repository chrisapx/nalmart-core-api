import { Op } from 'sequelize';
import Delivery from '../models/Delivery';
import DeliveryMethod from '../models/DeliveryMethod';
import DeliveryAddress from '../models/DeliveryAddress';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import Product from '../models/Product';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

export class DeliveryService {
  /**
   * Calculate shipping fee based on delivery method and order details
   */
  static async calculateShippingFee(
    deliveryMethodId: number,
    totalWeight: number,
    orderSubtotal: number,
    zipCode?: string
  ): Promise<number> {
    try {
      const method = await DeliveryMethod.findByPk(deliveryMethodId);
      if (!method) {
        throw new NotFoundError('Delivery method not found');
      }

      if (!method.is_active) {
        throw new BadRequestError('Selected delivery method is not available');
      }

      // Check weight limit
      if (method.max_weight && totalWeight > method.max_weight) {
        throw new BadRequestError(
          `Order weight exceeds limit for ${method.name}. Max: ${method.max_weight}kg`
        );
      }

      // Calculate base fee
      let fee = method.base_fee;

      // Add weight-based fee
      if (totalWeight > 0) {
        fee += totalWeight * Number(method.fee_per_kg);
      }

      // Apply free shipping threshold
      if (
        method.free_shipping_threshold &&
        orderSubtotal >= method.free_shipping_threshold
      ) {
        fee = 0;
      }

      // Apply max fee cap
      if (method.max_fee && fee > method.max_fee) {
        fee = Number(method.max_fee);
      }

      return Number(fee.toFixed(2));
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error calculating shipping fee:', error);
      throw new Error('Failed to calculate shipping fee');
    }
  }

  /**
   * Create a delivery for an order
   */
  static async createDelivery(data: {
    order_id: number;
    delivery_method_id: number;
    delivery_address_id: number;
    total_weight: number;
    delivery_type?: string;
    insurance_cost?: number;
    notes?: string;
  }): Promise<Delivery> {
    try {
      const { order_id, delivery_method_id, delivery_address_id } = data;

      // Verify order exists
      const order = await Order.findByPk(order_id);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Verify delivery address exists
      const address = await DeliveryAddress.findByPk(delivery_address_id);
      if (!address) {
        throw new NotFoundError('Delivery address not found');
      }

      // Verify delivery method exists
      const method = await DeliveryMethod.findByPk(delivery_method_id);
      if (!method || !method.is_active) {
        throw new NotFoundError('Delivery method not found or inactive');
      }

      // Calculate shipping fee
      const shippingFee = await this.calculateShippingFee(
        delivery_method_id,
        data.total_weight,
        order.subtotal
      );

      // Calculate total cost (shipping + insurance + tax)
      const insuranceCost = data.insurance_cost || 0;
      const totalCost = shippingFee + insuranceCost;

      // Calculate estimated delivery date
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + method.delivery_days);

      // Create delivery
      const delivery = await Delivery.create({
        order_id,
        delivery_method_id,
        delivery_address_id,
        total_weight: data.total_weight,
        shipping_fee: shippingFee,
        insurance_cost: insuranceCost,
        total_cost: totalCost,
        delivery_type: data.delivery_type || 'standard',
        estimated_delivery_date: estimatedDate,
        notes: data.notes,
        tracking_history: [
          {
            status: 'pending',
            timestamp: new Date(),
            notes: 'Delivery created',
          },
        ],
      });

      logger.info(`Delivery created for order ${order_id} with fee $${shippingFee}`);
      return delivery;
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error creating delivery:', error);
      throw new Error('Failed to create delivery');
    }
  }

  /**
   * Get delivery by ID with relationships
   */
  static async getDeliveryById(id: number): Promise<Delivery | null> {
    try {
      return await Delivery.findByPk(id, {
        include: [
          {
            model: Order,
            attributes: ['id', 'order_number', 'status'],
          },
          {
            model: DeliveryMethod,
            attributes: ['id', 'name', 'type', 'delivery_days'],
          },
          {
            model: DeliveryAddress,
            attributes: [
              'id',
              'full_name',
              'address_line_1',
              'address_line_2',
              'city',
              'state',
              'postal_code',
              'country',
            ],
          },
        ],
      });
    } catch (error) {
      logger.error('Error fetching delivery:', error);
      throw new Error('Failed to fetch delivery');
    }
  }

  /**
   * Get deliveries for an order
   */
  static async getDeliveriesByOrderId(orderId: number): Promise<Delivery[]> {
    try {
      return await Delivery.findAll({
        where: { order_id: orderId },
        include: [
          { model: DeliveryMethod },
          { model: DeliveryAddress },
        ],
        order: [['created_at', 'DESC']],
      });
    } catch (error) {
      logger.error('Error fetching deliveries for order:', error);
      throw new Error('Failed to fetch deliveries');
    }
  }

  /**
   * Update delivery status with tracking history
   */
  static async updateDeliveryStatus(
    deliveryId: number,
    newStatus: string,
    location?: string,
    notes?: string
  ): Promise<Delivery> {
    try {
      const delivery = await Delivery.findByPk(deliveryId);
      if (!delivery) {
        throw new NotFoundError('Delivery not found');
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending: ['processing', 'cancelled'],
        processing: ['dispatched', 'cancelled'],
        dispatched: ['in_transit', 'cancelled'],
        in_transit: ['out_for_delivery', 'failed', 'cancelled'],
        out_for_delivery: ['delivered', 'failed'],
        delivered: ['returned'],
        failed: ['in_transit', 'cancelled'],
        returned: [],
        cancelled: [],
      };

      if (!validTransitions[delivery.status]?.includes(newStatus)) {
        throw new BadRequestError(
          `Cannot transition from ${delivery.status} to ${newStatus}`
        );
      }

      // Update tracking history
      const trackingHistory = delivery.tracking_history || [];
      trackingHistory.push({
        status: newStatus,
        timestamp: new Date(),
        location,
        notes,
      });

      // Update delivered_at if status is delivered
      const updateData: any = {
        status: newStatus,
        tracking_history: trackingHistory,
      };

      if (newStatus === 'delivered') {
        updateData.delivered_at = new Date();
      }

      await delivery.update(updateData);

      logger.info(`Delivery ${deliveryId} status updated to ${newStatus}`);
      return delivery;
    } catch (error) {
      if (error instanceof (NotFoundError || BadRequestError)) {
        throw error;
      }
      logger.error('Error updating delivery status:', error);
      throw new Error('Failed to update delivery status');
    }
  }

  /**
   * Generate tracking number
   */
  static async generateTrackingNumber(
    deliveryId: number,
    carrierName: string
  ): Promise<string> {
    try {
      const delivery = await Delivery.findByPk(deliveryId);
      if (!delivery) {
        throw new NotFoundError('Delivery not found');
      }

      // Generate tracking number format: CARRIER_TIMESTAMP_DELIVERYID
      const timestamp = Date.now().toString().slice(-6);
      const carrierPrefix = carrierName.substring(0, 3).toUpperCase();
      const trackingNumber = `${carrierPrefix}${timestamp}${deliveryId}`;

      await delivery.update({
        tracking_number: trackingNumber,
        carrier_name: carrierName,
      });

      logger.info(`Tracking number ${trackingNumber} generated for delivery ${deliveryId}`);
      return trackingNumber;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error generating tracking number:', error);
      throw new Error('Failed to generate tracking number');
    }
  }

  /**
   * Get available delivery methods
   */
  static async getAvailableMethods(): Promise<DeliveryMethod[]> {
    try {
      return await DeliveryMethod.findAll({
        where: { is_active: true },
        order: [['display_order', 'ASC']],
      });
    } catch (error) {
      logger.error('Error fetching delivery methods:', error);
      throw new Error('Failed to fetch delivery methods');
    }
  }

  /**
   * Create delivery method (admin)
   */
  static async createDeliveryMethod(data: Partial<DeliveryMethod>): Promise<DeliveryMethod> {
    try {
      return await DeliveryMethod.create(data);
    } catch (error) {
      logger.error('Error creating delivery method:', error);
      throw new Error('Failed to create delivery method');
    }
  }

  /**
   * Update delivery method (admin)
   */
  static async updateDeliveryMethod(
    id: number,
    data: Partial<DeliveryMethod>
  ): Promise<DeliveryMethod> {
    try {
      const method = await DeliveryMethod.findByPk(id);
      if (!method) {
        throw new NotFoundError('Delivery method not found');
      }

      await method.update(data);
      return method;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error updating delivery method:', error);
      throw new Error('Failed to update delivery method');
    }
  }

  /**
   * Create delivery address for user
   */
  static async createDeliveryAddress(data: {
    user_id: number;
    full_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string;
    is_default?: boolean;
  }): Promise<DeliveryAddress> {
    try {
      // If marking as default, unset other defaults for this user
      if (data.is_default) {
        await DeliveryAddress.update(
          { is_default: false },
          { where: { user_id: data.user_id } }
        );
      }

      return await DeliveryAddress.create(data);
    } catch (error) {
      logger.error('Error creating delivery address:', error);
      throw new Error('Failed to create delivery address');
    }
  }

  /**
   * Get user's delivery addresses
   */
  static async getUserDeliveryAddresses(userId: number): Promise<DeliveryAddress[]> {
    try {
      return await DeliveryAddress.findAll({
        where: { user_id: userId },
        order: [['is_default', 'DESC'], ['created_at', 'DESC']],
      });
    } catch (error) {
      logger.error('Error fetching user delivery addresses:', error);
      throw new Error('Failed to fetch delivery addresses');
    }
  }

  /**
   * Update delivery address
   */
  static async updateDeliveryAddress(
    id: number,
    userId: number,
    data: Partial<DeliveryAddress>
  ): Promise<DeliveryAddress> {
    try {
      const address = await DeliveryAddress.findOne({
        where: { id, user_id: userId },
      });

      if (!address) {
        throw new NotFoundError('Delivery address not found');
      }

      // If marking as default, unset other defaults
      if (data.is_default) {
        await DeliveryAddress.update(
          { is_default: false },
          { where: { user_id: userId, id: { [Op.ne]: id } } }
        );
      }

      await address.update(data);
      return address;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error updating delivery address:', error);
      throw new Error('Failed to update delivery address');
    }
  }

  /**
   * Delete delivery address
   */
  static async deleteDeliveryAddress(id: number, userId: number): Promise<void> {
    try {
      const address = await DeliveryAddress.findOne({
        where: { id, user_id: userId },
      });

      if (!address) {
        throw new NotFoundError('Delivery address not found');
      }

      await address.destroy();
      logger.info(`Delivery address ${id} deleted for user ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deleting delivery address:', error);
      throw new Error('Failed to delete delivery address');
    }
  }

  /**
   * Get delivery statistics (admin dashboard)
   */
  static async getDeliveryStats(): Promise<Record<string, any>> {
    try {
      const totalDeliveries = await Delivery.count();
      const deliveredCount = await Delivery.count({ where: { status: 'delivered' } });
      const inTransitCount = await Delivery.count({
        where: { status: ['in_transit', 'out_for_delivery'] },
      });
      const failedCount = await Delivery.count({ where: { status: 'failed' } });

      const avgShippingFee = await Delivery.sum('shipping_fee', {
        where: { status: 'delivered' },
      });

      return {
        total: totalDeliveries,
        delivered: deliveredCount,
        delivery_rate: totalDeliveries > 0 ? (deliveredCount / totalDeliveries) * 100 : 0,
        in_transit: inTransitCount,
        failed: failedCount,
        avg_shipping_fee: avgShippingFee || 0,
      };
    } catch (error) {
      logger.error('Error fetching delivery stats:', error);
      throw new Error('Failed to fetch delivery statistics');
    }
  }
}

export default DeliveryService;
