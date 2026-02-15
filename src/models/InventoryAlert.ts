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
import Inventory from './Inventory';
import User from './User';

@Table({
  tableName: 'inventory_alerts',
  timestamps: true,
  underscored: true,
  comment: 'Low stock alerts and notifications',
})
export default class InventoryAlert extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Inventory)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  inventory_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'User who acknowledged the alert',
  })
  acknowledged_by!: number;

  @Column({
    type: DataType.ENUM('low_stock', 'out_of_stock', 'overstock', 'expiring', 'expired', 'damaged'),
    allowNull: false,
    comment: 'Type of alert',
  })
  alert_type!: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Current stock when alert was triggered',
  })
  current_quantity!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Threshold that triggered the alert',
  })
  threshold!: number;

  @Column({
    type: DataType.ENUM('pending', 'acknowledged', 'resolved', 'ignored'),
    defaultValue: 'pending',
    comment: 'Alert status',
  })
  status!: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Number of times alert was sent to users',
  })
  notification_count!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When the alert was first triggered',
  })
  triggered_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When alert was acknowledged/resolved',
  })
  acknowledged_at!: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Action taken to resolve (e.g., "Ordered 1000 units")',
  })
  resolution_action!: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Additional alert context',
  })
  metadata!: Record<string, any>;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relationships
  @BelongsTo(() => Inventory, {
    foreignKey: 'inventory_id',
    onDelete: 'CASCADE',
  })
  inventory?: Inventory;

  @BelongsTo(() => User, {
    foreignKey: 'acknowledged_by',
    onDelete: 'SET NULL',
  })
  acknowledging_user?: User;
}
