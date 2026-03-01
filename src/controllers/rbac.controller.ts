import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import Role from '../models/Role';
import Permission from '../models/Permission';
import User from '../models/User';
import UserRole from '../models/UserRole';
import RolePermission from '../models/RolePermission';
import { successResponse } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { Op } from 'sequelize';

// ─── Roles ───────────────────────────────────────────────────────────────────

export const getRoles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, through: { attributes: [] } }],
      order: [['sort_order', 'ASC']],
    });
    successResponse(res, roles, 'Roles retrieved');
  } catch (e) { next(e); }
};

export const getRoleById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await Role.findByPk(parseInt(String(req.params.id), 10), {
      include: [{ model: Permission, through: { attributes: [] } }],
    });
    if (!role) throw new NotFoundError('Role not found');
    successResponse(res, role, 'Role retrieved');
  } catch (e) { next(e); }
};

export const createRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, description, sort_order = 99 } = req.body;
    if (!name || !slug) throw new BadRequestError('name and slug are required');
    const role = await Role.create({ name, slug, description, sort_order, is_active: true, created_at: new Date(), updated_at: new Date() });
    successResponse(res, role, 'Role created', 201);
  } catch (e) { next(e); }
};

export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await Role.findByPk(parseInt(String(req.params.id), 10));
    if (!role) throw new NotFoundError('Role not found');
    const { name, description, is_active, sort_order } = req.body;
    await role.update({ name, description, is_active, sort_order, updated_at: new Date() });
    successResponse(res, role, 'Role updated');
  } catch (e) { next(e); }
};

export const deleteRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await Role.findByPk(parseInt(String(req.params.id), 10));
    if (!role) throw new NotFoundError('Role not found');
    if (['super-admin', 'admin'].includes(role.slug)) throw new BadRequestError('Cannot delete system roles');
    await RolePermission.destroy({ where: { role_id: role.id } });
    await UserRole.destroy({ where: { role_id: role.id } });
    await role.destroy();
    successResponse(res, null, 'Role deleted');
  } catch (e) { next(e); }
};

// ─── Role Permissions ─────────────────────────────────────────────────────────

export const getRolePermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rps = await RolePermission.findAll({ where: { role_id: parseInt(String(req.params.id), 10) } });
    successResponse(res, rps.map((r: any) => r.permission_id), 'Role permissions retrieved');
  } catch (e) { next(e); }
};

export const setRolePermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roleId = parseInt(String(req.params.id), 10);
    const role = await Role.findByPk(roleId);
    if (!role) throw new NotFoundError('Role not found');

    const { permission_ids }: { permission_ids: number[] } = req.body;
    if (!Array.isArray(permission_ids)) throw new BadRequestError('permission_ids must be an array');

    await RolePermission.destroy({ where: { role_id: roleId } });

    if (permission_ids.length > 0) {
      await RolePermission.bulkCreate(
        permission_ids.map((pid) => ({
          role_id: roleId,
          permission_id: pid,
          created_at: new Date(),
          updated_at: new Date(),
        }))
      );
    }

    successResponse(res, { role_id: roleId, permission_ids }, 'Role permissions updated');
  } catch (e) { next(e); }
};

// ─── Permissions ──────────────────────────────────────────────────────────────

export const getPermissions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const perms = await Permission.findAll({ order: [['category', 'ASC'], ['name', 'ASC']] });

    // Group by category
    const grouped: Record<string, typeof perms> = {};
    for (const p of perms) {
      const cat = (p as any).category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    successResponse(res, { all: perms, grouped }, 'Permissions retrieved');
  } catch (e) { next(e); }
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = '1', limit = '50', search } = req.query;
    const offset = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Role, through: { attributes: [] } }],
      attributes: ['id', 'name', 'email', 'is_active', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: parseInt(String(limit), 10),
      offset,
    });

    successResponse(res, { users: rows, total: count, page: parseInt(String(page), 10) }, 'Users retrieved');
  } catch (e) { next(e); }
};

export const assignRoleToUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = parseInt(String(req.params.userId), 10);
    const { role_id } = req.body;
    if (!role_id) throw new BadRequestError('role_id is required');

    const [, created] = await UserRole.findOrCreate({
      where: { user_id: userId, role_id: parseInt(String(role_id), 10) },
      defaults: {
        user_id: userId,
        role_id: parseInt(String(role_id), 10),
        assigned_by: req.user?.id,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
    });

    successResponse(res, { user_id: userId, role_id, created }, created ? 'Role assigned' : 'Role already assigned');
  } catch (e) { next(e); }
};

export const removeRoleFromUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = parseInt(String(req.params.userId), 10);
    const roleId = parseInt(String(req.params.roleId), 10);
    await UserRole.destroy({ where: { user_id: userId, role_id: roleId } });
    successResponse(res, null, 'Role removed from user');
  } catch (e) { next(e); }
};
