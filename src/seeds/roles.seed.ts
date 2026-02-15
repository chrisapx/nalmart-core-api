import Role from '../models/Role';
import Permission from '../models/Permission';
import RolePermission from '../models/RolePermission';
import logger from '../utils/logger';

interface RoleData {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
}

export const roles: RoleData[] = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Full system access with all permissions',
    permissions: ['ALL_FUNCTIONS'],
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Administrative access with most permissions',
    permissions: [
      'ALL_FUNCTIONS_WRITE',
      'VIEW_DASHBOARD',
      'VIEW_SALES_ANALYTICS',
      'VIEW_CUSTOMER_ANALYTICS',
      'VIEW_INVENTORY_ANALYTICS',
      'VIEW_FINANCIAL_REPORTS',
      'VIEW_SETTINGS',
      'UPDATE_SETTINGS',
      'VIEW_SYSTEM_LOGS',
    ],
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Manage products, orders, and inventory',
    permissions: [
      // Products
      'VIEW_PRODUCT',
      'CREATE_PRODUCT',
      'UPDATE_PRODUCT',
      'DELETE_PRODUCT',
      'PUBLISH_PRODUCT',
      'FEATURE_PRODUCT',
      'UPDATE_PRODUCT_STOCK',
      'UPDATE_PRODUCT_PRICE',
      'UPLOAD_PRODUCT_IMAGES',
      'DELETE_PRODUCT_IMAGES',
      'IMPORT_PRODUCTS',
      'EXPORT_PRODUCTS',
      'VIEW_PRODUCT_ANALYTICS',
      // Categories
      'VIEW_CATEGORY',
      'CREATE_CATEGORY',
      'UPDATE_CATEGORY',
      'DELETE_CATEGORY',
      'REORDER_CATEGORY',
      'UPLOAD_CATEGORY_IMAGES',
      // Orders
      'VIEW_ORDER',
      'VIEW_ORDER_DETAILS',
      'UPDATE_ORDER',
      'CANCEL_ORDER',
      'PROCESS_ORDER',
      'SHIP_ORDER',
      'COMPLETE_ORDER',
      'REFUND_ORDER',
      'UPDATE_ORDER_STATUS',
      'EXPORT_ORDERS',
      'VIEW_ORDER_ANALYTICS',
      // Coupons
      'VIEW_COUPON',
      'CREATE_COUPON',
      'UPDATE_COUPON',
      'DELETE_COUPON',
      'APPLY_COUPON',
      'VIEW_COUPON_USAGE',
      // Campaigns
      'VIEW_CAMPAIGN',
      'CREATE_CAMPAIGN',
      'UPDATE_CAMPAIGN',
      'DELETE_CAMPAIGN',
      'PUBLISH_CAMPAIGN',
      'VIEW_CAMPAIGN_ANALYTICS',
      'CREATE_PROMOTION',
      'APPLY_PROMOTION',
      // Reviews
      'VIEW_REVIEW',
      'MANAGE_REVIEW',
      'APPROVE_REVIEW',
      'FLAG_REVIEW',
      'DELETE_REVIEW',
      'RESPOND_TO_REVIEW',
      // Analytics
      'VIEW_DASHBOARD',
      'VIEW_SALES_ANALYTICS',
      'VIEW_INVENTORY_ANALYTICS',
    ],
  },
  {
    name: 'Content Manager',
    slug: 'content-manager',
    description: 'Manage website content including products and categories',
    permissions: [
      // Products
      'VIEW_PRODUCT',
      'CREATE_PRODUCT',
      'UPDATE_PRODUCT',
      'PUBLISH_PRODUCT',
      'FEATURE_PRODUCT',
      'UPDATE_PRODUCT_STOCK',
      'UPDATE_PRODUCT_PRICE',
      'UPLOAD_PRODUCT_IMAGES',
      'DELETE_PRODUCT_IMAGES',
      'VIEW_PRODUCT_ANALYTICS',
      // Categories
      'VIEW_CATEGORY',
      'CREATE_CATEGORY',
      'UPDATE_CATEGORY',
      'REORDER_CATEGORY',
      'UPLOAD_CATEGORY_IMAGES',
      // Reviews
      'VIEW_REVIEW',
      'APPROVE_REVIEW',
      'FLAG_REVIEW',
      'RESPOND_TO_REVIEW',
      // Basic views
      'VIEW_DASHBOARD',
    ],
  },
  {
    name: 'Customer Support',
    slug: 'customer-support',
    description: 'Handle customer inquiries and orders',
    permissions: [
      // Orders
      'VIEW_ORDER',
      'VIEW_ORDER_DETAILS',
      'UPDATE_ORDER',
      'CANCEL_ORDER',
      'UPDATE_ORDER_STATUS',
      'PROCESS_ORDER',
      // Support
      'VIEW_SUPPORT_TICKET',
      'CREATE_SUPPORT_TICKET',
      'UPDATE_SUPPORT_TICKET',
      'RESPOND_TO_SUPPORT_TICKET',
      'CLOSE_SUPPORT_TICKET',
      // Users
      'VIEW_USER',
      'VIEW_USER_PROFILE',
      // Products (view only)
      'VIEW_PRODUCT',
      // Reviews
      'VIEW_REVIEW',
      'FLAG_REVIEW',
      'RESPOND_TO_REVIEW',
      // Coupons
      'VIEW_COUPON',
      'APPLY_COUPON',
      // Dashboard
      'VIEW_DASHBOARD',
    ],
  },
  {
    name: 'Staff',
    slug: 'staff',
    description: 'Basic staff access for order processing',
    permissions: [
      // Orders
      'VIEW_ORDER',
      'VIEW_ORDER_DETAILS',
      'UPDATE_ORDER_STATUS',
      'PROCESS_ORDER',
      'SHIP_ORDER',
      // Products (view only)
      'VIEW_PRODUCT',
      // Support
      'VIEW_SUPPORT_TICKET',
      'RESPOND_TO_SUPPORT_TICKET',
      // Dashboard
      'VIEW_DASHBOARD',
    ],
  },
  {
    name: 'Customer',
    slug: 'customer',
    description: 'Standard customer access',
    permissions: [
      // Own data
      'VIEW_USER_PROFILE',
      'UPDATE_USER_PROFILE',
      'VIEW_OWN_ORDER',
      // Shopping
      'VIEW_PRODUCT',
      'VIEW_CART',
      'ADD_TO_CART',
      'UPDATE_CART',
      'REMOVE_FROM_CART',
      'CLEAR_CART',
      'CREATE_ORDER',
      // Wishlist
      'VIEW_WISHLIST',
      'ADD_TO_WISHLIST',
      'REMOVE_FROM_WISHLIST',
      'SHARE_WISHLIST',
      // Reviews
      'VIEW_REVIEW',
      'CREATE_REVIEW',
      'UPDATE_REVIEW',
      // Support
      'CREATE_SUPPORT_TICKET',
      'VIEW_SUPPORT_TICKET',
    ],
  },
];

export const seedRoles = async (): Promise<void> => {
  try {
    logger.info('Starting role seeding...');

    for (const roleData of roles) {
      // Create or update role
      const [role, roleCreated] = await Role.findOrCreate({
        where: { slug: roleData.slug },
        defaults: {
          name: roleData.name,
          slug: roleData.slug,
          description: roleData.description,
        },
      });

      if (roleCreated) {
        logger.info(`✅ Created role: ${role.slug}`);
      } else {
        await role.update({
          name: roleData.name,
          description: roleData.description,
        });
        logger.info(`ℹ️  Updated role: ${role.slug}`);
      }

      // Assign permissions to role
      for (const permissionSlug of roleData.permissions) {
        const permission = await Permission.findOne({
          where: { slug: permissionSlug },
        });

        if (permission) {
          const [rolePermission, created] = await RolePermission.findOrCreate({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (created) {
            logger.debug(`  ✅ Assigned permission ${permissionSlug} to role ${role.slug}`);
          }
        } else {
          logger.warn(`  ⚠️  Permission not found: ${permissionSlug}`);
        }
      }

      logger.info(`✅ Configured role: ${role.slug} with ${roleData.permissions.length} permissions`);
    }

    logger.info(`✅ Role seeding complete! Total: ${roles.length} roles`);
  } catch (error) {
    logger.error('❌ Error seeding roles:', error);
    throw error;
  }
};
