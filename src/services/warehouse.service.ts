import { Op } from 'sequelize';
import WarehouseJob, { WarehouseJobStage } from '../models/WarehouseJob';
import WarehouseJobItem from '../models/WarehouseJobItem';
import OrderItem from '../models/OrderItem';
import Order from '../models/Order';
import User from '../models/User';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

const STAGE_FLOW: WarehouseJobStage[] = [
  'pending_pick',
  'processing',
  'picking',
  'shipping',
  'packing',
  'qa',
  'open_for_delivery',
  'out_for_delivery',
  'delivered',
];

function nextStage(current: WarehouseJobStage): WarehouseJobStage | null {
  const idx = STAGE_FLOW.indexOf(current);
  return idx >= 0 && idx < STAGE_FLOW.length - 1 ? STAGE_FLOW[idx + 1] : null;
}

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export class WarehouseService {
  /**
   * Create a warehouse job for an order (called when order is confirmed)
   */
  static async createJob(orderId: number): Promise<WarehouseJob> {
    const existing = await WarehouseJob.findOne({ where: { order_id: orderId } });
    if (existing) return existing;

    const orderItems = await OrderItem.findAll({ where: { order_id: orderId } });
    if (!orderItems.length) {
      throw new BadRequestError('Order has no items');
    }

    const job = await WarehouseJob.create({
      order_id: orderId,
      stage: 'pending_pick',
      qa_flagged: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create job items from order items
    await Promise.all(
      orderItems.map((oi) =>
        WarehouseJobItem.create({
          warehouse_job_id: job.id,
          order_item_id: oi.id,
          product_id: oi.product_id,
          product_name: oi.product_name,
          product_sku: oi.product_sku || null,
          quantity_expected: oi.quantity,
          created_at: new Date(),
          updated_at: new Date(),
        })
      )
    );

    return WarehouseService.getJobById(job.id);
  }

  /**
   * Get all jobs, optionally filtered by stage
   */
  static async getJobs(options: {
    stage?: WarehouseJobStage | WarehouseJobStage[];
    page?: number;
    limit?: number;
  }): Promise<{ jobs: WarehouseJob[]; total: number; page: number; totalPages: number }> {
    const { stage, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (stage) {
      where.stage = Array.isArray(stage) ? { [Op.in]: stage } : stage;
    }

    const { count, rows } = await WarehouseJob.findAndCountAll({
      where,
      include: [
        { model: Order, attributes: ['id', 'order_number', 'total_amount', 'payment_method', 'payment_status', 'status', 'fulfillment_status'] },
        { model: WarehouseJobItem },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      jobs: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Get a single job with full details
   */
  static async getJobById(id: number): Promise<WarehouseJob> {
    const job = await WarehouseJob.findByPk(id, {
      include: [
        {
          model: Order,
          attributes: ['id', 'order_number', 'total_amount', 'shipping_address', 'payment_method', 'payment_status'],
          include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] }],
        },
        { model: WarehouseJobItem },
      ],
    });
    if (!job) throw new NotFoundError('Warehouse job not found');
    return job;
  }

  /**
   * Advance job to the next stage
   */
  static async advanceStage(id: number, userId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(id);

    if (job.stage === 'pending_pick') {
      await job.update({
        stage: 'processing',
        selected_for_processing_at: new Date(),
        selected_for_processing_by: userId,
        updated_at: new Date(),
      });
      return WarehouseService.getJobById(id);
    }

    const next = nextStage(job.stage);
    if (!next) throw new BadRequestError('Job is already at terminal stage');

    const updates: any = { stage: next, updated_at: new Date() };
    const now = new Date();

    switch (next) {
      case 'picking':
        updates.picking_started_at = now;
        updates.assigned_picker_id = userId;
        break;
      case 'shipping':
        updates.picking_completed_at = now;
        updates.shipping_started_at = now;
        updates.assigned_shipper_id = userId;
        break;
      case 'packing':
        updates.shipping_completed_at = now;
        updates.packing_started_at = now;
        updates.assigned_packer_id = userId;
        break;
      case 'qa':
        updates.qa_started_at = now;
        updates.assigned_qa_id = userId;
        break;
      case 'open_for_delivery':
        updates.packing_completed_at = now;
        updates.open_for_delivery_at = now;
        break;
      case 'out_for_delivery':
        updates.dispatch_at = now;
        updates.out_for_delivery_at = now;
        break;
      case 'delivered':
        updates.delivery_code_confirmed_at = now;
        break;
    }

    await job.update(updates);
    await WarehouseService.syncOrderFulfillment(job.order_id, next);
    return WarehouseService.getJobById(id);
  }

  static async selectForProcessing(id: number, adminId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(id);
    if (job.stage !== 'pending_pick') {
      throw new BadRequestError(`Only pending_pick jobs can be selected (current: ${job.stage})`);
    }

    await job.update({
      stage: 'processing',
      selected_for_processing_at: new Date(),
      selected_for_processing_by: adminId,
      updated_at: new Date(),
    });

    await WarehouseService.syncOrderFulfillment(job.order_id, 'processing');
    return WarehouseService.getJobById(id);
  }

  /**
   * Update individual item pick/pack status
   */
  static async updateItemStatus(
    jobId: number,
    itemId: number,
    data: {
      action: 'pick' | 'ship' | 'pack';
      status: string;
      quantity?: number;
      notes?: string;
      userId: number;
    }
  ): Promise<WarehouseJobItem> {
    const item = await WarehouseJobItem.findOne({
      where: { id: itemId, warehouse_job_id: jobId },
    });
    if (!item) throw new NotFoundError('Warehouse job item not found');

    const job = await WarehouseService.getJobById(jobId);

    if (data.action === 'pick') {
      if (!['processing', 'picking'].includes(job.stage)) {
        throw new BadRequestError(`Cannot pick items while job is in ${job.stage}`);
      }

      if (job.stage === 'processing') {
        await job.update({
          stage: 'picking',
          picking_started_at: job.picking_started_at || new Date(),
          assigned_picker_id: job.assigned_picker_id || data.userId,
          updated_at: new Date(),
        });
        await WarehouseService.syncOrderFulfillment(job.order_id, 'picking');
      }
    }

    if (data.action === 'ship' && job.stage !== 'shipping') {
      throw new BadRequestError(`Cannot perform shipping checks while job is in ${job.stage}`);
    }

    if (data.action === 'pack' && !['packing', 'qa'].includes(job.stage)) {
      throw new BadRequestError(`Cannot pack items while job is in ${job.stage}`);
    }

    if (data.action === 'pick') {
      await item.update({
        pick_status: data.status,
        quantity_picked: data.quantity ?? item.quantity_expected,
        pick_notes: data.notes ?? item.pick_notes,
        picked_by: data.userId,
        picked_at: new Date(),
        updated_at: new Date(),
      });
    } else if (data.action === 'ship') {
      await item.update({
        shipping_status: data.status,
        quantity_shipped: data.quantity ?? item.quantity_expected,
        shipping_notes: data.notes ?? item.shipping_notes,
        shipped_by: data.userId,
        shipped_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await item.update({
        pack_status: data.status,
        quantity_packed: data.quantity ?? item.quantity_expected,
        pack_notes: data.notes ?? item.pack_notes,
        packed_by: data.userId,
        packed_at: new Date(),
        updated_at: new Date(),
      });
    }

    return item.reload();
  }

  static async completePicking(jobId: number, userId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    if (job.stage !== 'picking') {
      throw new BadRequestError(`Only picking jobs can be completed (current: ${job.stage})`);
    }

    const hasPending = job.items.some((item) => item.pick_status === 'pending');
    if (hasPending) {
      throw new BadRequestError('All items must be picked/flagged before completing picking');
    }

    await job.update({
      stage: 'shipping',
      picking_completed_at: new Date(),
      shipping_started_at: new Date(),
      assigned_shipper_id: userId,
      updated_at: new Date(),
    });

    await WarehouseService.syncOrderFulfillment(job.order_id, 'shipping');
    return WarehouseService.getJobById(jobId);
  }

  static async completeShipping(jobId: number, userId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    if (job.stage !== 'shipping') {
      throw new BadRequestError(`Only shipping jobs can be completed (current: ${job.stage})`);
    }

    const hasPending = job.items.some((item) => item.shipping_status === 'pending');
    if (hasPending) {
      throw new BadRequestError('All items must be checked in shipping before completing shipping stage');
    }

    const hasMissing = job.items.some((item) => ['missing', 'flagged'].includes(item.shipping_status));

    if (hasMissing) {
      await job.update({
        stage: 'picking',
        picking_started_at: new Date(),
        assigned_picker_id: userId,
        updated_at: new Date(),
      });
      await WarehouseService.syncOrderFulfillment(job.order_id, 'picking');
      return WarehouseService.getJobById(jobId);
    }

    await job.update({
      stage: 'packing',
      shipping_completed_at: new Date(),
      packing_started_at: new Date(),
      assigned_packer_id: userId,
      updated_at: new Date(),
    });

    await WarehouseService.syncOrderFulfillment(job.order_id, 'packing');
    return WarehouseService.getJobById(jobId);
  }

  static async completePacking(jobId: number, userId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    if (!['packing', 'qa'].includes(job.stage)) {
      throw new BadRequestError(`Only packing/qa jobs can be completed (current: ${job.stage})`);
    }

    const hasPending = job.items.some((item) => item.pack_status === 'pending');
    if (hasPending) {
      throw new BadRequestError('All items must be packed/flagged before completing packing stage');
    }

    const hasMissing = job.items.some((item) => ['missing', 'flagged'].includes(item.pack_status));

    if (hasMissing) {
      await job.update({
        stage: 'qa',
        qa_flagged: true,
        qa_started_at: job.qa_started_at || new Date(),
        assigned_qa_id: userId,
        updated_at: new Date(),
      });
      await WarehouseService.syncOrderFulfillment(job.order_id, 'qa');
      return WarehouseService.getJobById(jobId);
    }

    await job.update({
      stage: 'open_for_delivery',
      qa_flagged: false,
      packing_completed_at: new Date(),
      sealed_at: new Date(),
      open_for_delivery_at: new Date(),
      updated_at: new Date(),
    });

    await WarehouseService.syncOrderFulfillment(job.order_id, 'open_for_delivery');
    return WarehouseService.getJobById(jobId);
  }

  static async resolveQa(jobId: number, userId: number, notes?: string): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    if (job.stage !== 'qa') {
      throw new BadRequestError(`Only qa jobs can be resolved (current: ${job.stage})`);
    }

    await job.update({
      stage: 'packing',
      qa_flagged: false,
      qa_notes: notes ?? job.qa_notes,
      qa_completed_at: new Date(),
      packing_started_at: new Date(),
      assigned_packer_id: userId,
      updated_at: new Date(),
    });

    await WarehouseService.syncOrderFulfillment(job.order_id, 'packing');
    return WarehouseService.getJobById(jobId);
  }

  /**
   * Assign a delivery agent
   */
  static async assignAgent(jobId: number, agentId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    if (job.stage !== 'open_for_delivery') {
      throw new BadRequestError(`Agents can only be assigned at open_for_delivery stage (current: ${job.stage})`);
    }
    await job.update({ assigned_agent_id: agentId, updated_at: new Date() });
    return WarehouseService.getJobById(jobId);
  }

  /**
   * Generate a delivery code for the job
   */
  static async generateDeliveryCode(jobId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    if (!['open_for_delivery', 'out_for_delivery'].includes(job.stage)) {
      throw new BadRequestError(`Delivery code can only be generated when open/out for delivery (current: ${job.stage})`);
    }
    const code = generateCode();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await job.update({
      delivery_code: code,
      delivery_code_expires_at: expires,
      updated_at: new Date(),
    });
    return WarehouseService.getJobById(jobId);
  }

  /**
   * Confirm delivery with code (used by delivery agent)
   */
  static async confirmDelivery(
    jobId: number,
    code: string,
    cashCollected: boolean
  ): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);

    if (job.stage !== 'out_for_delivery') {
      throw new BadRequestError(`Delivery can only be confirmed from out_for_delivery stage (current: ${job.stage})`);
    }

    if (!job.delivery_code) throw new BadRequestError('No delivery code generated for this job');
    if (job.delivery_code !== code.toUpperCase()) throw new BadRequestError('Invalid delivery code');
    if (job.delivery_code_expires_at && job.delivery_code_expires_at < new Date()) {
      throw new BadRequestError('Delivery code has expired');
    }

    const order = await Order.findByPk(job.order_id);
    if (!order) throw new NotFoundError('Order not found for warehouse job');

    const isCod = (order.payment_method || '').toLowerCase().includes('cod')
      || (order.payment_method || '').toLowerCase().includes('cash');
    if (isCod && !cashCollected) {
      throw new BadRequestError('Cash must be confirmed as received for COD orders before delivery confirmation');
    }

    await job.update({
      stage: 'delivered',
      delivery_code_confirmed_at: new Date(),
      cash_collected: cashCollected,
      updated_at: new Date(),
    });

    await Order.update(
      { fulfillment_status: 'delivered', delivered_at: new Date(), status: 'delivered', updated_at: new Date() },
      { where: { id: job.order_id } }
    );

    return WarehouseService.getJobById(jobId);
  }

  static async dispatchForDelivery(jobId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    if (job.stage !== 'open_for_delivery') {
      throw new BadRequestError(`Only open_for_delivery jobs can be dispatched (current: ${job.stage})`);
    }

    if (!job.assigned_agent_id) {
      throw new BadRequestError('Assign a delivery agent before dispatching for delivery');
    }

    if (!job.delivery_code) {
      const code = generateCode();
      await job.update({
        delivery_code: code,
        delivery_code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    await job.update({
      stage: 'out_for_delivery',
      dispatch_at: new Date(),
      out_for_delivery_at: new Date(),
      updated_at: new Date(),
    });

    await WarehouseService.syncOrderFulfillment(job.order_id, 'out_for_delivery');
    return WarehouseService.getJobById(jobId);
  }

  /**
   * Mark label as printed
   */
  static async printLabel(jobId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    await job.update({
      box_label_printed: true,
      box_label_printed_at: new Date(),
      updated_at: new Date(),
    });
    return WarehouseService.getJobById(jobId);
  }

  static async getLabelPayload(jobId: number): Promise<Record<string, any>> {
    const job = await WarehouseService.getJobById(jobId);
    const order = await Order.findByPk(job.order_id, {
      include: [{ model: User, attributes: ['first_name', 'last_name', 'phone', 'email'] }],
    });

    if (!order) throw new NotFoundError('Order not found for label generation');

    return {
      job_id: job.id,
      order_id: order.id,
      order_number: order.order_number,
      customer_name: `${(order as any).user?.first_name || ''} ${(order as any).user?.last_name || ''}`.trim(),
      customer_phone: (order as any).user?.phone || null,
      shipping_address: order.shipping_address || null,
      delivery_code: job.delivery_code || null,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Cancel a job
   */
  static async cancelJob(jobId: number, notes?: string): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    await job.update({
      stage: 'cancelled',
      admin_notes: notes ?? job.admin_notes,
      updated_at: new Date(),
    });

    await Order.update(
      { fulfillment_status: 'cancelled', status: 'cancelled', cancelled_at: new Date(), updated_at: new Date() },
      { where: { id: job.order_id } }
    );

    return WarehouseService.getJobById(jobId);
  }

  /**
   * Get job counts by stage (dashboard stats)
   */
  static async getStats(): Promise<Record<string, number>> {
    const rows = await WarehouseJob.findAll({
      attributes: ['stage', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      group: ['stage'],
      raw: true,
    }) as any[];

    const stats: Record<string, number> = {};
    for (const stage of STAGE_FLOW) stats[stage] = 0;
    for (const row of rows) stats[row.stage] = parseInt(row.count, 10);
    return stats;
  }

  /**
   * Backfill warehouse jobs for existing confirmed orders that don't have one yet.
   * Safe to call repeatedly — skips orders that already have a job.
   */
  static async backfillExistingOrders(): Promise<void> {
    const { Op } = require('sequelize');
    const orders = await Order.findAll({
      where: { status: { [Op.notIn]: ['pending', 'cancelled'] } },
    });

    let created = 0;
    for (const order of orders) {
      try {
        const existing = await WarehouseJob.findOne({ where: { order_id: order.id } });
        if (existing) continue;

        const orderItems = await OrderItem.findAll({ where: { order_id: order.id } });
        if (!orderItems.length) continue;

        // Map order/fulfillment status → warehouse stage
        let stage: WarehouseJobStage = 'pending_pick';
        const fs = (order as any).fulfillment_status as string | undefined;
        const os = order.status;
        if (os === 'delivered') stage = 'delivered';
        else if (fs === 'out_for_delivery') stage = 'out_for_delivery';
        else if (fs === 'shipped') stage = 'open_for_delivery';
        else if (fs === 'packed') stage = 'packing';
        else if (fs === 'picked') stage = 'shipping';
        else if (fs === 'processing') stage = 'processing';
        else if (os === 'shipped') stage = 'out_for_delivery';
        else if (os === 'confirmed') stage = 'processing';

        const job = await WarehouseJob.create({
          order_id: order.id,
          stage,
          created_at: (order as any).created_at ?? new Date(),
          updated_at: new Date(),
        });

        await Promise.all(
          orderItems.map((oi) =>
            WarehouseJobItem.create({
              warehouse_job_id: job.id,
              order_item_id: oi.id,
              product_id: oi.product_id,
              product_name: oi.product_name,
              product_sku: oi.product_sku || null,
              quantity_expected: oi.quantity,
              created_at: (order as any).created_at ?? new Date(),
              updated_at: new Date(),
            })
          )
        );
        created++;
      } catch (err) {
        logger.warn(`[Warehouse backfill] Failed for order ${order.id}:`, err);
      }
    }
    if (created > 0) {
      logger.info(`🏭 [Warehouse backfill] Created ${created} job(s) for existing orders.`);
    }
  }

  private static async syncOrderFulfillment(orderId: number, stage: WarehouseJobStage): Promise<void> {
    const updates: any = { updated_at: new Date() };

    if (['processing', 'picking', 'shipping', 'qa'].includes(stage)) {
      updates.fulfillment_status = 'processing';
    }

    if (stage === 'packing') {
      updates.fulfillment_status = 'packed';
      updates.packed_at = new Date();
    }

    if (stage === 'open_for_delivery') {
      updates.fulfillment_status = 'shipped';
      updates.shipped_at = new Date();
      updates.status = 'shipped';
    }

    if (stage === 'out_for_delivery') {
      updates.fulfillment_status = 'out_for_delivery';
      updates.out_for_delivery_at = new Date();
      updates.status = 'shipped';
    }

    if (stage === 'delivered') {
      updates.fulfillment_status = 'delivered';
      updates.delivered_at = new Date();
      updates.status = 'delivered';
    }

    if (stage === 'cancelled') {
      updates.fulfillment_status = 'cancelled';
      updates.cancelled_at = new Date();
      updates.status = 'cancelled';
    }

    await Order.update(updates, { where: { id: orderId } });
  }
}
