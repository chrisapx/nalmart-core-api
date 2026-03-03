import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { WarehouseService } from '../services/warehouse.service';
import { successResponse } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export const getJobs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { stage, page = '1', limit = '20' } = req.query;
    const result = await WarehouseService.getJobs({
      stage: stage ? String(stage) as any : undefined,
      page: parseInt(String(page), 10),
      limit: parseInt(String(limit), 10),
    });
    successResponse(res, result, 'Warehouse jobs retrieved');
  } catch (e) { next(e); }
};

export const getJobById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await WarehouseService.getJobById(parseInt(String(req.params.id), 10));
    successResponse(res, job, 'Warehouse job retrieved');
  } catch (e) { next(e); }
};

export const createJobForOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { order_id } = req.body;
    if (!order_id) throw new BadRequestError('order_id is required');
    const job = await WarehouseService.createJob(parseInt(String(order_id), 10));
    successResponse(res, job, 'Warehouse job created', 201);
  } catch (e) { next(e); }
};

export const advanceStage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestError('Authentication required');
    const job = await WarehouseService.advanceStage(parseInt(String(req.params.id), 10), userId);
    successResponse(res, job, 'Stage advanced');
  } catch (e) { next(e); }
};

export const selectForProcessing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestError('Authentication required');
    const job = await WarehouseService.selectForProcessing(parseInt(String(req.params.id), 10), userId);
    successResponse(res, job, 'Order selected for processing');
  } catch (e) { next(e); }
};

export const updateItemStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestError('Authentication required');
    const { action, status, quantity, notes } = req.body;
    if (!action || !status) throw new BadRequestError('action and status are required');
    if (!['pick', 'ship', 'pack'].includes(action)) {
      throw new BadRequestError('action must be one of: pick, ship, pack');
    }
    const item = await WarehouseService.updateItemStatus(
      parseInt(String(req.params.id), 10),
      parseInt(String(req.params.itemId), 10),
      { action, status, quantity, notes, userId }
    );
    successResponse(res, item, 'Item status updated');
  } catch (e) { next(e); }
};

export const completePicking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestError('Authentication required');
    const job = await WarehouseService.completePicking(parseInt(String(req.params.id), 10), userId);
    successResponse(res, job, 'Picking completed, moved to shipping');
  } catch (e) { next(e); }
};

export const completeShipping = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestError('Authentication required');
    const job = await WarehouseService.completeShipping(parseInt(String(req.params.id), 10), userId);
    successResponse(res, job, 'Shipping stage completed');
  } catch (e) { next(e); }
};

export const completePacking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestError('Authentication required');
    const job = await WarehouseService.completePacking(parseInt(String(req.params.id), 10), userId);
    successResponse(res, job, 'Packing stage completed');
  } catch (e) { next(e); }
};

export const resolveQa = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestError('Authentication required');
    const { notes } = req.body;
    const job = await WarehouseService.resolveQa(parseInt(String(req.params.id), 10), userId, notes);
    successResponse(res, job, 'QA resolved, order moved back to packing');
  } catch (e) { next(e); }
};

export const assignAgent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { agent_id } = req.body;
    if (!agent_id) throw new BadRequestError('agent_id is required');
    const job = await WarehouseService.assignAgent(parseInt(String(req.params.id), 10), parseInt(String(agent_id), 10));
    successResponse(res, job, 'Agent assigned');
  } catch (e) { next(e); }
};

export const generateDeliveryCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await WarehouseService.generateDeliveryCode(parseInt(String(req.params.id), 10));
    successResponse(res, { delivery_code: job.delivery_code, expires_at: job.delivery_code_expires_at }, 'Delivery code generated');
  } catch (e) { next(e); }
};

export const confirmDelivery = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, cash_collected = false } = req.body;
    if (!code) throw new BadRequestError('code is required');
    const job = await WarehouseService.confirmDelivery(parseInt(String(req.params.id), 10), String(code), Boolean(cash_collected));
    successResponse(res, job, 'Delivery confirmed');
  } catch (e) { next(e); }
};

export const dispatchForDelivery = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await WarehouseService.dispatchForDelivery(parseInt(String(req.params.id), 10));
    successResponse(res, job, 'Order dispatched for delivery');
  } catch (e) { next(e); }
};

export const printLabel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await WarehouseService.printLabel(parseInt(String(req.params.id), 10));
    successResponse(res, { box_label_printed_at: job.box_label_printed_at }, 'Label marked as printed');
  } catch (e) { next(e); }
};

export const getLabelPayload = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = await WarehouseService.getLabelPayload(parseInt(String(req.params.id), 10));
    successResponse(res, payload, 'Label payload generated');
  } catch (e) { next(e); }
};

export const cancelJob = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { notes } = req.body;
    const job = await WarehouseService.cancelJob(parseInt(String(req.params.id), 10), notes);
    successResponse(res, job, 'Warehouse job cancelled');
  } catch (e) { next(e); }
};

export const getJobStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await WarehouseService.getStats();
    successResponse(res, stats, 'Warehouse stats retrieved');
  } catch (e) { next(e); }
};
