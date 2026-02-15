import Permission from '../models/Permission';
import logger from '../utils/logger';

export const permissions = [
  // Special Permissions
  { name: 'All Functions', slug: 'ALL_FUNCTIONS', category: 'System', description: 'Full system access - super admin only' },
  { name: 'All Functions Read', slug: 'ALL_FUNCTIONS_READ', category: 'System', description: 'Read-only access to all resources' },
  { name: 'All Functions Write', slug: 'ALL_FUNCTIONS_WRITE', category: 'System', description: 'Create, update, delete access to all resources' },

  // User Management (10)
  { name: 'View Users', slug: 'VIEW_USER', category: 'Users', description: 'View user list and details' },
  { name: 'Create User', slug: 'CREATE_USER', category: 'Users', description: 'Create new users' },
  { name: 'Update User', slug: 'UPDATE_USER', category: 'Users', description: 'Update user information' },
  { name: 'Delete User', slug: 'DELETE_USER', category: 'Users', description: 'Delete users' },
  { name: 'Manage Users', slug: 'MANAGE_USER', category: 'Users', description: 'Full user management access' },
  { name: 'View User Profile', slug: 'VIEW_USER_PROFILE', category: 'Users', description: 'View own profile' },
  { name: 'Update User Profile', slug: 'UPDATE_USER_PROFILE', category: 'Users', description: 'Update own profile' },
  { name: 'View User Permissions', slug: 'VIEW_USER_PERMISSIONS', category: 'Users', description: 'View user permissions' },
  { name: 'Suspend User', slug: 'SUSPEND_USER', category: 'Users', description: 'Suspend user accounts' },
  { name: 'Activate User', slug: 'ACTIVATE_USER', category: 'Users', description: 'Activate user accounts' },

  // Role Management (8)
  { name: 'View Roles', slug: 'VIEW_ROLE', category: 'Roles', description: 'View role list and details' },
  { name: 'Create Role', slug: 'CREATE_ROLE', category: 'Roles', description: 'Create new roles' },
  { name: 'Update Role', slug: 'UPDATE_ROLE', category: 'Roles', description: 'Update role information' },
  { name: 'Delete Role', slug: 'DELETE_ROLE', category: 'Roles', description: 'Delete roles' },
  { name: 'Manage Roles', slug: 'MANAGE_ROLE', category: 'Roles', description: 'Full role management access' },
  { name: 'Assign Role', slug: 'ASSIGN_ROLE', category: 'Roles', description: 'Assign roles to users' },
  { name: 'Remove Role', slug: 'REMOVE_ROLE', category: 'Roles', description: 'Remove roles from users' },
  { name: 'View Role Permissions', slug: 'VIEW_ROLE_PERMISSIONS', category: 'Roles', description: 'View role permissions' },

  // Permission Management (6)
  { name: 'View Permissions', slug: 'VIEW_PERMISSION', category: 'Permissions', description: 'View permission list' },
  { name: 'Create Permission', slug: 'CREATE_PERMISSION', category: 'Permissions', description: 'Create new permissions' },
  { name: 'Update Permission', slug: 'UPDATE_PERMISSION', category: 'Permissions', description: 'Update permissions' },
  { name: 'Delete Permission', slug: 'DELETE_PERMISSION', category: 'Permissions', description: 'Delete permissions' },
  { name: 'Assign Permission', slug: 'ASSIGN_PERMISSION', category: 'Permissions', description: 'Assign permissions to roles' },
  { name: 'Remove Permission', slug: 'REMOVE_PERMISSION', category: 'Permissions', description: 'Remove permissions from roles' },

  // Product Management (14)
  { name: 'View Products', slug: 'VIEW_PRODUCT', category: 'Products', description: 'View product catalog' },
  { name: 'Create Product', slug: 'CREATE_PRODUCT', category: 'Products', description: 'Create new products' },
  { name: 'Update Product', slug: 'UPDATE_PRODUCT', category: 'Products', description: 'Update product information' },
  { name: 'Delete Product', slug: 'DELETE_PRODUCT', category: 'Products', description: 'Delete products' },
  { name: 'Manage Products', slug: 'MANAGE_PRODUCT', category: 'Products', description: 'Full product management access' },
  { name: 'Publish Product', slug: 'PUBLISH_PRODUCT', category: 'Products', description: 'Publish/unpublish products' },
  { name: 'Feature Product', slug: 'FEATURE_PRODUCT', category: 'Products', description: 'Feature/unfeature products' },
  { name: 'Update Product Stock', slug: 'UPDATE_PRODUCT_STOCK', category: 'Products', description: 'Update product stock levels' },
  { name: 'Update Product Price', slug: 'UPDATE_PRODUCT_PRICE', category: 'Products', description: 'Update product pricing' },
  { name: 'Upload Product Images', slug: 'UPLOAD_PRODUCT_IMAGES', category: 'Products', description: 'Upload product images' },
  { name: 'Delete Product Images', slug: 'DELETE_PRODUCT_IMAGES', category: 'Products', description: 'Delete product images' },
  { name: 'Import Products', slug: 'IMPORT_PRODUCTS', category: 'Products', description: 'Bulk import products' },
  { name: 'Export Products', slug: 'EXPORT_PRODUCTS', category: 'Products', description: 'Export product data' },
  { name: 'View Product Analytics', slug: 'VIEW_PRODUCT_ANALYTICS', category: 'Products', description: 'View product performance analytics' },

  // Category Management (7)
  { name: 'View Categories', slug: 'VIEW_CATEGORY', category: 'Categories', description: 'View category list' },
  { name: 'Create Category', slug: 'CREATE_CATEGORY', category: 'Categories', description: 'Create new categories' },
  { name: 'Update Category', slug: 'UPDATE_CATEGORY', category: 'Categories', description: 'Update categories' },
  { name: 'Delete Category', slug: 'DELETE_CATEGORY', category: 'Categories', description: 'Delete categories' },
  { name: 'Manage Categories', slug: 'MANAGE_CATEGORY', category: 'Categories', description: 'Full category management' },
  { name: 'Reorder Categories', slug: 'REORDER_CATEGORY', category: 'Categories', description: 'Change category order' },
  { name: 'Upload Category Images', slug: 'UPLOAD_CATEGORY_IMAGES', category: 'Categories', description: 'Upload category images' },

  // Order Management (15)
  { name: 'View Orders', slug: 'VIEW_ORDER', category: 'Orders', description: 'View order list' },
  { name: 'View Order Details', slug: 'VIEW_ORDER_DETAILS', category: 'Orders', description: 'View detailed order information' },
  { name: 'View Own Orders', slug: 'VIEW_OWN_ORDER', category: 'Orders', description: 'View own orders only' },
  { name: 'Create Order', slug: 'CREATE_ORDER', category: 'Orders', description: 'Create new orders' },
  { name: 'Update Order', slug: 'UPDATE_ORDER', category: 'Orders', description: 'Update order information' },
  { name: 'Cancel Order', slug: 'CANCEL_ORDER', category: 'Orders', description: 'Cancel orders' },
  { name: 'Delete Order', slug: 'DELETE_ORDER', category: 'Orders', description: 'Delete orders' },
  { name: 'Manage Orders', slug: 'MANAGE_ORDER', category: 'Orders', description: 'Full order management access' },
  { name: 'Process Order', slug: 'PROCESS_ORDER', category: 'Orders', description: 'Process pending orders' },
  { name: 'Ship Order', slug: 'SHIP_ORDER', category: 'Orders', description: 'Mark orders as shipped' },
  { name: 'Complete Order', slug: 'COMPLETE_ORDER', category: 'Orders', description: 'Mark orders as completed' },
  { name: 'Refund Order', slug: 'REFUND_ORDER', category: 'Orders', description: 'Process order refunds' },
  { name: 'Update Order Status', slug: 'UPDATE_ORDER_STATUS', category: 'Orders', description: 'Change order status' },
  { name: 'Export Orders', slug: 'EXPORT_ORDERS', category: 'Orders', description: 'Export order data' },
  { name: 'View Order Analytics', slug: 'VIEW_ORDER_ANALYTICS', category: 'Orders', description: 'View order analytics' },

  // Payment Management (8)
  { name: 'View Payments', slug: 'VIEW_PAYMENT', category: 'Payments', description: 'View payment records' },
  { name: 'Process Payment', slug: 'PROCESS_PAYMENT', category: 'Payments', description: 'Process payments' },
  { name: 'Refund Payment', slug: 'REFUND_PAYMENT', category: 'Payments', description: 'Process payment refunds' },
  { name: 'View Payment Details', slug: 'VIEW_PAYMENT_DETAILS', category: 'Payments', description: 'View detailed payment info' },
  { name: 'Manage Payments', slug: 'MANAGE_PAYMENT', category: 'Payments', description: 'Full payment management' },
  { name: 'Configure Payment Methods', slug: 'CONFIGURE_PAYMENT_METHODS', category: 'Payments', description: 'Configure payment gateways' },
  { name: 'Export Payments', slug: 'EXPORT_PAYMENTS', category: 'Payments', description: 'Export payment data' },
  { name: 'View Payment Analytics', slug: 'VIEW_PAYMENT_ANALYTICS', category: 'Payments', description: 'View payment analytics' },

  // Coupon Management (8)
  { name: 'View Coupons', slug: 'VIEW_COUPON', category: 'Coupons', description: 'View coupon list' },
  { name: 'Create Coupon', slug: 'CREATE_COUPON', category: 'Coupons', description: 'Create new coupons' },
  { name: 'Update Coupon', slug: 'UPDATE_COUPON', category: 'Coupons', description: 'Update coupon details' },
  { name: 'Delete Coupon', slug: 'DELETE_COUPON', category: 'Coupons', description: 'Delete coupons' },
  { name: 'Manage Coupons', slug: 'MANAGE_COUPON', category: 'Coupons', description: 'Full coupon management' },
  { name: 'Apply Coupon', slug: 'APPLY_COUPON', category: 'Coupons', description: 'Apply coupons to orders' },
  { name: 'View Coupon Usage', slug: 'VIEW_COUPON_USAGE', category: 'Coupons', description: 'View coupon usage statistics' },
  { name: 'Export Coupons', slug: 'EXPORT_COUPONS', category: 'Coupons', description: 'Export coupon data' },

  // Campaign Management (10)
  { name: 'View Campaigns', slug: 'VIEW_CAMPAIGN', category: 'Campaigns', description: 'View campaign list' },
  { name: 'Create Campaign', slug: 'CREATE_CAMPAIGN', category: 'Campaigns', description: 'Create new campaigns' },
  { name: 'Update Campaign', slug: 'UPDATE_CAMPAIGN', category: 'Campaigns', description: 'Update campaign details' },
  { name: 'Delete Campaign', slug: 'DELETE_CAMPAIGN', category: 'Campaigns', description: 'Delete campaigns' },
  { name: 'Manage Campaigns', slug: 'MANAGE_CAMPAIGN', category: 'Campaigns', description: 'Full campaign management' },
  { name: 'Publish Campaign', slug: 'PUBLISH_CAMPAIGN', category: 'Campaigns', description: 'Publish/unpublish campaigns' },
  { name: 'View Campaign Analytics', slug: 'VIEW_CAMPAIGN_ANALYTICS', category: 'Campaigns', description: 'View campaign performance' },
  { name: 'Create Promotion', slug: 'CREATE_PROMOTION', category: 'Campaigns', description: 'Create promotion codes' },
  { name: 'Apply Promotion', slug: 'APPLY_PROMOTION', category: 'Campaigns', description: 'Apply promotions to orders' },
  { name: 'Export Campaigns', slug: 'EXPORT_CAMPAIGNS', category: 'Campaigns', description: 'Export campaign data' },

  // Review Management (8)
  { name: 'View Reviews', slug: 'VIEW_REVIEW', category: 'Reviews', description: 'View product reviews' },
  { name: 'Create Review', slug: 'CREATE_REVIEW', category: 'Reviews', description: 'Write product reviews' },
  { name: 'Update Review', slug: 'UPDATE_REVIEW', category: 'Reviews', description: 'Update own reviews' },
  { name: 'Delete Review', slug: 'DELETE_REVIEW', category: 'Reviews', description: 'Delete reviews' },
  { name: 'Manage Reviews', slug: 'MANAGE_REVIEW', category: 'Reviews', description: 'Full review management' },
  { name: 'Approve Review', slug: 'APPROVE_REVIEW', category: 'Reviews', description: 'Approve pending reviews' },
  { name: 'Flag Review', slug: 'FLAG_REVIEW', category: 'Reviews', description: 'Flag inappropriate reviews' },
  { name: 'Respond to Review', slug: 'RESPOND_TO_REVIEW', category: 'Reviews', description: 'Respond to customer reviews' },

  // Wishlist Management (5)
  { name: 'View Wishlist', slug: 'VIEW_WISHLIST', category: 'Wishlist', description: 'View wishlist items' },
  { name: 'Add to Wishlist', slug: 'ADD_TO_WISHLIST', category: 'Wishlist', description: 'Add products to wishlist' },
  { name: 'Remove from Wishlist', slug: 'REMOVE_FROM_WISHLIST', category: 'Wishlist', description: 'Remove items from wishlist' },
  { name: 'Share Wishlist', slug: 'SHARE_WISHLIST', category: 'Wishlist', description: 'Share wishlist with others' },
  { name: 'Manage Wishlist', slug: 'MANAGE_WISHLIST', category: 'Wishlist', description: 'Full wishlist management' },

  // Cart Management (6)
  { name: 'View Cart', slug: 'VIEW_CART', category: 'Cart', description: 'View shopping cart' },
  { name: 'Add to Cart', slug: 'ADD_TO_CART', category: 'Cart', description: 'Add products to cart' },
  { name: 'Update Cart', slug: 'UPDATE_CART', category: 'Cart', description: 'Update cart quantities' },
  { name: 'Remove from Cart', slug: 'REMOVE_FROM_CART', category: 'Cart', description: 'Remove items from cart' },
  { name: 'Clear Cart', slug: 'CLEAR_CART', category: 'Cart', description: 'Clear entire cart' },
  { name: 'Manage Cart', slug: 'MANAGE_CART', category: 'Cart', description: 'Full cart management' },

  // Analytics (8)
  { name: 'View Dashboard', slug: 'VIEW_DASHBOARD', category: 'Analytics', description: 'View admin dashboard' },
  { name: 'View Sales Analytics', slug: 'VIEW_SALES_ANALYTICS', category: 'Analytics', description: 'View sales reports' },
  { name: 'View Customer Analytics', slug: 'VIEW_CUSTOMER_ANALYTICS', category: 'Analytics', description: 'View customer insights' },
  { name: 'View Inventory Analytics', slug: 'VIEW_INVENTORY_ANALYTICS', category: 'Analytics', description: 'View inventory reports' },
  { name: 'View Financial Reports', slug: 'VIEW_FINANCIAL_REPORTS', category: 'Analytics', description: 'View financial reports' },
  { name: 'Export Analytics', slug: 'EXPORT_ANALYTICS', category: 'Analytics', description: 'Export analytics data' },
  { name: 'View Realtime Analytics', slug: 'VIEW_REALTIME_ANALYTICS', category: 'Analytics', description: 'View real-time stats' },
  { name: 'Manage Analytics', slug: 'MANAGE_ANALYTICS', category: 'Analytics', description: 'Configure analytics settings' },

  // Settings Management (10)
  { name: 'View Settings', slug: 'VIEW_SETTINGS', category: 'Settings', description: 'View system settings' },
  { name: 'Update Settings', slug: 'UPDATE_SETTINGS', category: 'Settings', description: 'Update system settings' },
  { name: 'Manage Settings', slug: 'MANAGE_SETTINGS', category: 'Settings', description: 'Full settings management' },
  { name: 'Configure Shipping', slug: 'CONFIGURE_SHIPPING', category: 'Settings', description: 'Configure shipping methods' },
  { name: 'Configure Tax', slug: 'CONFIGURE_TAX', category: 'Settings', description: 'Configure tax settings' },
  { name: 'Configure Email', slug: 'CONFIGURE_EMAIL', category: 'Settings', description: 'Configure email templates' },
  { name: 'Configure Notifications', slug: 'CONFIGURE_NOTIFICATIONS', category: 'Settings', description: 'Configure notifications' },
  { name: 'Manage Integrations', slug: 'MANAGE_INTEGRATIONS', category: 'Settings', description: 'Manage third-party integrations' },
  { name: 'View System Logs', slug: 'VIEW_SYSTEM_LOGS', category: 'Settings', description: 'View system activity logs' },
  { name: 'Manage System', slug: 'MANAGE_SYSTEM', category: 'Settings', description: 'System administration' },

  // Customer Support (7)
  { name: 'View Support Tickets', slug: 'VIEW_SUPPORT_TICKET', category: 'Support', description: 'View support tickets' },
  { name: 'Create Support Ticket', slug: 'CREATE_SUPPORT_TICKET', category: 'Support', description: 'Create support tickets' },
  { name: 'Update Support Ticket', slug: 'UPDATE_SUPPORT_TICKET', category: 'Support', description: 'Update ticket status' },
  { name: 'Respond to Support Ticket', slug: 'RESPOND_TO_SUPPORT_TICKET', category: 'Support', description: 'Respond to tickets' },
  { name: 'Close Support Ticket', slug: 'CLOSE_SUPPORT_TICKET', category: 'Support', description: 'Close support tickets' },
  { name: 'Delete Support Ticket', slug: 'DELETE_SUPPORT_TICKET', category: 'Support', description: 'Delete tickets' },
  { name: 'Manage Support', slug: 'MANAGE_SUPPORT', category: 'Support', description: 'Full support management' },
];

export const seedPermissions = async (): Promise<void> => {
  try {
    logger.info('Starting permission seeding...');

    for (const permissionData of permissions) {
      const [permission, created] = await Permission.findOrCreate({
        where: { slug: permissionData.slug },
        defaults: permissionData,
      });

      if (created) {
        logger.info(`✅ Created permission: ${permission.slug}`);
      } else {
        // Update existing permission
        await permission.update(permissionData);
        logger.info(`ℹ️  Updated permission: ${permission.slug}`);
      }
    }

    logger.info(`✅ Permission seeding complete! Total: ${permissions.length} permissions`);
  } catch (error) {
    logger.error('❌ Error seeding permissions:', error);
    throw error;
  }
};
