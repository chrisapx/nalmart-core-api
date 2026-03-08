import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  Index,
} from 'sequelize-typescript';

@Table({
  tableName: 'push_subscriptions',
  timestamps: true,
  underscored: true,
})
export default class PushSubscription extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  /** Null = unauthenticated / admin-browser subscriptions will set role */
  @Index
  @Column({ type: DataType.BIGINT, allowNull: true })
  user_id!: number | null;

  /**
   * 'client' = regular customer (order-status emails)
   * 'admin'  = admin hub users (new-order alerts + all status events)
   */
  @Index
  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'client' })
  role!: 'client' | 'admin';

  /** Web Push subscription endpoint URL */
  @Column({ type: DataType.TEXT, allowNull: false })
  endpoint!: string;

  /** base64url p256dh key */
  @Column({ type: DataType.TEXT, allowNull: false })
  p256dh!: string;

  /** base64url auth secret */
  @Column({ type: DataType.TEXT, allowNull: false })
  auth!: string;

  /** User-agent / device hint (optional, for cleaner dedup) */
  @Column({ type: DataType.STRING(255), allowNull: true })
  user_agent!: string | null;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
