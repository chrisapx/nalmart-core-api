import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import Store from './Store';
import User from './User';

export type StoreRole = 'owner' | 'manager' | 'staff' | 'viewer';

/** Fine-grained permissions a store manager can grant to staff/viewers */
export const STORE_PERMISSION_SLUGS = [
  'VIEW_STORE_PRODUCTS',
  'MANAGE_STORE_PRODUCTS',
  'VIEW_STORE_ORDERS',
  'MANAGE_STORE_ORDERS',
  'VIEW_STORE_PAYMENTS',
  'VIEW_STORE_ANALYTICS',
  'MANAGE_STORE_STAFF',
] as const;

export type StorePermissionSlug = typeof STORE_PERMISSION_SLUGS[number];

/** Default permissions per role */
export const DEFAULT_ROLE_PERMISSIONS: Record<StoreRole, StorePermissionSlug[]> = {
  owner: [
    'VIEW_STORE_PRODUCTS', 'MANAGE_STORE_PRODUCTS',
    'VIEW_STORE_ORDERS', 'MANAGE_STORE_ORDERS',
    'VIEW_STORE_PAYMENTS', 'VIEW_STORE_ANALYTICS', 'MANAGE_STORE_STAFF',
  ],
  manager: [
    'VIEW_STORE_PRODUCTS', 'MANAGE_STORE_PRODUCTS',
    'VIEW_STORE_ORDERS', 'MANAGE_STORE_ORDERS',
    'VIEW_STORE_PAYMENTS', 'VIEW_STORE_ANALYTICS', 'MANAGE_STORE_STAFF',
  ],
  staff: [
    'VIEW_STORE_PRODUCTS', 'MANAGE_STORE_PRODUCTS',
    'VIEW_STORE_ORDERS', 'MANAGE_STORE_ORDERS',
  ],
  viewer: [
    'VIEW_STORE_PRODUCTS', 'VIEW_STORE_ORDERS', 'VIEW_STORE_PAYMENTS',
  ],
};

@Table({
  tableName: 'store_users',
  timestamps: true,
  underscored: true,
})
export default class StoreUser extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Store)
  @Column({ type: DataType.BIGINT, allowNull: false })
  store_id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, allowNull: false })
  user_id!: number;

  @Column({
    type: DataType.ENUM('owner', 'manager', 'staff', 'viewer'),
    allowNull: false,
    defaultValue: 'staff',
    comment: 'owner = full control, manager = manage staff + all, staff = products/orders, viewer = read-only',
  })
  role!: StoreRole;

  /** Fine-grained permission overrides; null = use default for role */
  @Column({ type: DataType.JSON, allowNull: true })
  permissions?: StorePermissionSlug[] | null;

  /** Which admin/manager invited this user */
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, allowNull: true })
  invited_by?: number;

  @Column({ type: DataType.STRING(300), allowNull: true })
  invitation_note?: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => Store)
  store!: Store;

  @BelongsTo(() => User, { foreignKey: 'user_id', as: 'user', constraints: false })
  user!: User;

  @BelongsTo(() => User, { foreignKey: 'invited_by', as: 'invitedBy', constraints: false })
  invitedByUser?: User;
}
