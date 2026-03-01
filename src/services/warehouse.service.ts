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
  'picking',
  'packing',
  'ready_for_dispatch',
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
        { model: Order, attributes: ['id', 'order_number', 'total_amount', 'payment_method', 'payment_status'] },
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
    const next = nextStage(job.stage);
    if (!next) throw new BadRequestError('Job is already at terminal stage');

    const updates: any = { stage: next, updated_at: new Date() };
    const now = new Date();

    switch (next) {
      case 'picking':
        updates.picking_started_at = now;
        updates.assigned_picker_id = userId;
        break;
      case 'packing':
        updates.picking_completed_at = now;
        updates.packing_started_at = now;
        updates.assigned_packer_id = userId;
        break;
      case 'ready_for_dispatch':
        updates.packing_completed_at = now;
        break;
      case 'out_for_delivery':
        updates.dispatch_at = now;
        break;
      case 'delivered':
        updates.delivery_code_confirmed_at = now;
        break;
    }

    await job.update(updates);
    return WarehouseService.getJobById(id);
  }

  /**
   * Update individual item pick/pack status
   */
  static async updateItemStatus(
    jobId: number,
    itemId: number,
    data: {
      action: 'pick' | 'pack';
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

    if (data.action === 'pick') {
      await item.update({
        pick_status: data.status,
        quantity_picked: data.quantity ?? item.quantity_expected,
        pick_notes: data.notes ?? item.pick_notes,
        picked_by: data.userId,
        picked_at: new Date(),
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

    const job = await WarehouseService.getJobById(jobId);

    // Auto-check: all items picked → allow advance to packing
    const allItems = job.items || [];
    if (data.action === 'pick') {
      const allPicked = allItems.every((i) => i.pick_status === 'picked' || i.pick_status === 'missing' || i.pick_status === 'damaged');
      const hasMissing = allItems.some((i) => i.pick_status === 'missing' || i.pick_status === 'damaged');
      if (hasMissing) {
        await job.update({ qa_flagged: true, updated_at: new Date() });
      }
    }

    return item.reload();
  }

  /**
   * Assign a delivery agent
   */
  static async assignAgent(jobId: number, agentId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
    await job.update({ assigned_agent_id: agentId, updated_at: new Date() });
    return WarehouseService.getJobById(jobId);
  }

  /**
   * Generate a delivery code for the job
   */
  static async generateDeliveryCode(jobId: number): Promise<WarehouseJob> {
    const job = await WarehouseService.getJobById(jobId);
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

    if (!job.delivery_code) throw new BadRequestError('No delivery code generated for this job');
    if (job.delivery_code !== code.toUpperCase()) throw new BadRequestError('Invalid delivery code');
    if (job.delivery_code_expires_at && job.delivery_code_expires_at < new Date()) {
      throw new BadRequestError('Delivery code has expired');
    }

    await job.update({
      stage: 'delivered',
      delivery_code_confirmed_at: new Date(),
      cash_collected: cashCollected,
      updated_at: new Date(),
    });

    // Update the linked order fulfillment status too
    await Order.update(
      { fulfillment_status: 'delivered', delivered_at: new Date(), updated_at: new Date() },
      { where: { id: job.order_id } }
    );

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
        else if (os === 'shipped') stage = 'out_for_delivery';
        else if (fs === 'packed') stage = 'packing';
        else if (fs === 'picked') stage = 'picking';

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
}
