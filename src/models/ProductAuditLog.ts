import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import Product from './Product';
import User from './User';

@Table({
  tableName: 'product_audit_logs',
  timestamps: false,
  underscored: true,
})
export default class ProductAuditLog extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'The product that was acted upon',
  })
  product_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'The user who performed the action (null = system)',
  })
  actor_id!: number | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Snapshot of actor email at time of action',
  })
  actor_email!: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Snapshot of actor full name at time of action',
  })
  actor_name!: string | null;

  @Column({
    type: DataType.ENUM('create', 'update', 'delete', 'restore', 'publish', 'unpublish'),
    allowNull: false,
  })
  action!: 'create' | 'update' | 'delete' | 'restore' | 'publish' | 'unpublish';

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Field-level diff: { fieldName: { from: old, to: new } }',
  })
  changes!: Record<string, { from: unknown; to: unknown }> | null;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Full snapshot of the product at the time of the action',
  })
  snapshot!: Record<string, unknown> | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  ip_address!: string | null;

  @Column({
    type: DataType.STRING(300),
    allowNull: true,
  })
  user_agent!: string | null;

  @CreatedAt
  created_at!: Date;

  // Associations
  @BelongsTo(() => Product, { onDelete: 'CASCADE' })
  product!: Product;

  @BelongsTo(() => User, { foreignKey: 'actor_id', constraints: false })
  actor!: User;
}
