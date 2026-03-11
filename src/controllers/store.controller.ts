import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../types/express';
import StorePolicyFeature from '../models/StorePolicyFeature';
import { successResponse } from '../utils/response';

/**
 * Get all active store policy features (global or store-specific)
 */
export const getPolicyFeatures = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { storeId } = req.query;

    const where: any = {
      is_active: true,
    };

    // If storeId is provided, get store-specific features + global features
    // Otherwise, just get global features
    if (storeId) {
      const storeIdNum = parseInt(storeId as string, 10);
      where[Op.or] = [
        { store_id: null },
        { store_id: storeIdNum },
      ];
    } else {
      where.store_id = null;
    }

    const features = await StorePolicyFeature.findAll({
      where,
      order: [['sort_order', 'ASC']],
    });

    successResponse(
      res,
      features,
      'Policy features retrieved successfully',
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update a store policy feature (admin only)
 */
export const upsertPolicyFeature = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, ...featureData } = req.body;

    if (id) {
      // Update existing feature
      const feature = await StorePolicyFeature.findByPk(id);
      if (!feature) {
        res.status(404).json({ message: 'Feature not found' });
        return;
      }

      await feature.update(featureData);
      successResponse(res, feature, 'Policy feature updated successfully', 200);
    } else {
      // Create new feature
      const feature = await StorePolicyFeature.create(featureData);
      successResponse(res, feature, 'Policy feature created successfully', 201);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a store policy feature (admin only)
 */
export const deletePolicyFeature = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const featureId = parseInt(
      typeof idParam === 'string' ? idParam : idParam[0],
      10
    );
    const feature = await StorePolicyFeature.findByPk(featureId);

    if (!feature) {
      res.status(404).json({ message: 'Feature not found' });
      return;
    }

    await feature.destroy();
    successResponse(res, null, 'Policy feature deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};
