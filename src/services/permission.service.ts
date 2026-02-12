import User from '../models/User';
import Role from '../models/Role';
import Permission from '../models/Permission';

export class PermissionService {
  /**
   * Check if user has ALL_FUNCTIONS permission (super admin)
   */
  static async isSuperAdmin(user: User): Promise<boolean> {
    const userWithRoles = await User.findByPk(user.id, {
      include: [
        {
          model: Role,
          include: [Permission],
        },
      ],
    });

    if (!userWithRoles || !userWithRoles.roles) {
      return false;
    }

    return userWithRoles.roles.some((role) =>
      role.permissions?.some((permission) => permission.slug === 'ALL_FUNCTIONS')
    );
  }

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(user: User, permissionSlug: string): Promise<boolean> {
    // Check for super admin first
    const isSuperAdmin = await this.isSuperAdmin(user);
    if (isSuperAdmin) {
      return true;
    }

    const userWithRoles = await User.findByPk(user.id, {
      include: [
        {
          model: Role,
          include: [Permission],
        },
      ],
    });

    if (!userWithRoles || !userWithRoles.roles) {
      return false;
    }

    // Extract all permissions from all roles
    const userPermissions = userWithRoles.roles.flatMap((role) =>
      role.permissions?.map((p) => p.slug) || []
    );

    // Check for ALL_FUNCTIONS_READ for view permissions
    if (permissionSlug.startsWith('VIEW_') && userPermissions.includes('ALL_FUNCTIONS_READ')) {
      return true;
    }

    // Check for ALL_FUNCTIONS_WRITE for create/update/delete permissions
    const writeActions = ['CREATE_', 'UPDATE_', 'DELETE_', 'MANAGE_', 'ASSIGN_', 'REMOVE_'];
    const isWritePermission = writeActions.some((action) => permissionSlug.startsWith(action));
    if (isWritePermission && userPermissions.includes('ALL_FUNCTIONS_WRITE')) {
      return true;
    }

    // Check for specific permission
    return userPermissions.includes(permissionSlug);
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  static async hasAnyPermission(user: User, permissionSlugs: string[]): Promise<boolean> {
    for (const slug of permissionSlugs) {
      const hasPermission = await this.hasPermission(user, slug);
      if (hasPermission) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has ALL of the specified permissions
   */
  static async hasAllPermissions(user: User, permissionSlugs: string[]): Promise<boolean> {
    for (const slug of permissionSlugs) {
      const hasPermission = await this.hasPermission(user, slug);
      if (!hasPermission) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user can access a specific resource with an action
   */
  static async canAccessResource(
    user: User,
    resource: string,
    action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'MANAGE'
  ): Promise<boolean> {
    const permissionSlug = `${action}_${resource}`;
    return await this.hasPermission(user, permissionSlug);
  }

  /**
   * Check if user is an admin (has admin role)
   */
  static async isAdmin(user: User): Promise<boolean> {
    const userWithRoles = await User.findByPk(user.id, {
      include: [Role],
    });

    if (!userWithRoles || !userWithRoles.roles) {
      return false;
    }

    return userWithRoles.roles.some(
      (role) => role.slug === 'super-admin' || role.slug === 'admin'
    );
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(user: User): Promise<string[]> {
    const userWithRoles = await User.findByPk(user.id, {
      include: [
        {
          model: Role,
          include: [Permission],
        },
      ],
    });

    if (!userWithRoles || !userWithRoles.roles) {
      return [];
    }

    const permissions = userWithRoles.roles.flatMap((role) =>
      role.permissions?.map((p) => p.slug) || []
    );

    // Remove duplicates
    return [...new Set(permissions)];
  }

  /**
   * Get all roles for a user
   */
  static async getUserRoles(user: User): Promise<string[]> {
    const userWithRoles = await User.findByPk(user.id, {
      include: [Role],
    });

    if (!userWithRoles || !userWithRoles.roles) {
      return [];
    }

    return userWithRoles.roles.map((role) => role.slug);
  }
}
