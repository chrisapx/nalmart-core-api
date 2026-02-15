import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { ForbiddenError } from '../utils/errors';
import { PermissionService } from '../services/permission.service';
import logger from '../utils/logger';

/**
 * Authorize middleware - checks if user has required permission(s)
 *
 * @param requiredPermission - Single permission slug or array of permission slugs
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission. Default: false
 *
 * @example
 * // Single permission
 * router.post('/products', authenticate, authorize('CREATE_PRODUCT'), createProduct);
 *
 * // Any of multiple permissions
 * router.get('/products', authenticate, authorize(['VIEW_PRODUCT', 'MANAGE_PRODUCT']), getProducts);
 *
 * // All of multiple permissions
 * router.delete('/products/:id', authenticate, authorize(['DELETE_PRODUCT', 'MANAGE_PRODUCT'], true), deleteProduct);
 */
export const authorize = (
  requiredPermission: string | string[],
  requireAll: boolean = false
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new ForbiddenError('User not authenticated');
      }

      // Convert single permission to array
      const permissions = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      let hasAccess = false;

      if (requireAll) {
        // User must have ALL permissions
        hasAccess = await PermissionService.hasAllPermissions(user, permissions);
      } else {
        // User needs ANY of the permissions
        hasAccess = await PermissionService.hasAnyPermission(user, permissions);
      }

      if (!hasAccess) {
        logger.warn(
          `Access denied for user ${user.email}: Required permission(s) ${permissions.join(', ')}`
        );
        throw new ForbiddenError('You do not have permission to perform this action');
      }

      logger.debug(`Access granted for user ${user.email}: ${permissions.join(', ')}`);
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          message: error.message,
          statusCode: 403,
        });
      } else {
        logger.error('Authorization error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization check failed',
          statusCode: 500,
        });
      }
    }
  };
};

/**
 * Check if user is super admin (has ALL_FUNCTIONS permission)
 */
export const requireSuperAdmin = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new ForbiddenError('User not authenticated');
      }

      const isSuperAdmin = await PermissionService.isSuperAdmin(user);

      if (!isSuperAdmin) {
        logger.warn(`Super admin access denied for user ${user.email}`);
        throw new ForbiddenError('Super admin access required');
      }

      logger.debug(`Super admin access granted for user ${user.email}`);
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          message: error.message,
          statusCode: 403,
        });
      } else {
        logger.error('Super admin check error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization check failed',
          statusCode: 500,
        });
      }
    }
  };
};

/**
 * Check if user is admin (has admin or super-admin role)
 */
export const requireAdmin = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new ForbiddenError('User not authenticated');
      }

      const isAdmin = await PermissionService.isAdmin(user);

      if (!isAdmin) {
        logger.warn(`Admin access denied for user ${user.email}`);
        throw new ForbiddenError('Admin access required');
      }

      logger.debug(`Admin access granted for user ${user.email}`);
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          message: error.message,
          statusCode: 403,
        });
      } else {
        logger.error('Admin check error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization check failed',
          statusCode: 500,
        });
      }
    }
  };
};

/**
 * Check if user can access a specific resource with an action
 *
 * @example
 * router.get('/products/:id', authenticate, canAccess('PRODUCT', 'VIEW'), getProduct);
 * router.put('/products/:id', authenticate, canAccess('PRODUCT', 'UPDATE'), updateProduct);
 */
export const canAccess = (
  resource: string,
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'MANAGE'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new ForbiddenError('User not authenticated');
      }

      const hasAccess = await PermissionService.canAccessResource(user, resource, action);

      if (!hasAccess) {
        logger.warn(`Access denied for user ${user.email}: ${action}_${resource}`);
        throw new ForbiddenError('You do not have permission to perform this action');
      }

      logger.debug(`Access granted for user ${user.email}: ${action}_${resource}`);
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          message: error.message,
          statusCode: 403,
        });
      } else {
        logger.error('Resource access check error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization check failed',
          statusCode: 500,
        });
      }
    }
  };
};

/**
 * Optional Authorization (COMMENTED OUT BY DEFAULT)
 * Use this when you want to add permission checks but keep them disabled initially
 * 
 * @param requiredPermission - Single permission slug or array of permission slugs
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission.
 * 
 * @example
 * // Add to routes but keep commented in middleware
 * router.delete('/products/:id', authenticate, authorizeOptional('DELETE_PRODUCT'), deleteProduct);
 */
export const authorizeOptional = (
  requiredPermission: string | string[],
  requireAll: boolean = false
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new ForbiddenError('User not authenticated');
      }

      // ====================================================================
      // 🔒 PERMISSION CHECK (COMMENTED OUT - Uncomment to enable RBAC)
      // ====================================================================
      
      /*
      // Convert single permission to array
      const permissions = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      let hasAccess = false;

      if (requireAll) {
        // User must have ALL permissions
        hasAccess = await PermissionService.hasAllPermissions(user, permissions);
      } else {
        // User needs ANY of the permissions
        hasAccess = await PermissionService.hasAnyPermission(user, permissions);
      }

      if (!hasAccess) {
        logger.warn(
          `Access denied for user ${user.email}: Required permission(s) ${permissions.join(', ')}`
        );
        throw new ForbiddenError('You do not have permission to perform this action');
      }

      logger.debug(`Access granted for user ${user.email}: ${permissions.join(', ')}`);
      */

      // For now, allow all authenticated users (permission checking disabled)
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          success: false,
          message: error.message,
          statusCode: 403,
        });
      } else {
        logger.error('Authorization error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization check failed',
          statusCode: 500,
        });
      }
    }
  };
};
