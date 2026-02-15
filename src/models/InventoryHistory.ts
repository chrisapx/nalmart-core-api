import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import Inventory from './Inventory';
import InventoryBatch from './InventoryBatch';
import Warehouse from './Warehouse';
import Order from './Order';
import User from './User';

@Table({
  tableName: 'inventory_history',
  timestamps: false,
  underscored: true,
  comment: 'Complete audit trail of all inventory movements',
})
export default class InventoryHistory extends Model {
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

  @ForeignKey(() => InventoryBatch)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Batch involved (if applicable)',
  })
  batch_id!: number;

  @ForeignKey(() => Warehouse)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  warehouse_id!: number;

  @ForeignKey(() => Order)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Related order (if applicable)',
  })
  order_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'User who made the change',
  })
  user_id!: number;

  @Column({
    type: DataType.ENUM(
      'stock_in',
      'stock_out',
      'adjustment',
      'transfer',
      'return',
      'damage',
      'expiry',
      'recount',
      'reserve',
      'unreserve',
      'system_adjustment',
      'initial'
    ),
    allowNull: false,
    comment: 'Type of inventory movement',
  })
  transaction_type!: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Quantity changed (positive or negative)',
  })
  quantity_change!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Quantity before transaction',
  })
  quantity_before!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Quantity after transaction',
  })
  quantity_after!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Unit cost (if applicable)',
  })
  unit_cost!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Reference (PO number, RMA, etc.)',
  })
  reference!: string;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'rejected', 'cancelled'),
    defaultValue: 'completed',
  })
  status!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Reason for the transaction',
  })
  reason!: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Additional context data',
  })
  metadata!: Record<string, any>;

  @CreatedAt
  created_at!: Date;

  // Relationships
  @BelongsTo(() => Inventory, {
    foreignKey: 'inventory_id',
    onDelete: 'CASCADE',
  })
  inventory?: Inventory;

  @BelongsTo(() => InventoryBatch, {
    foreignKey: 'batch_id',
    onDelete: 'SET NULL',
  })
  batch?: InventoryBatch;

  @BelongsTo(() => Warehouse, {
    foreignKey: 'warehouse_id',
    onDelete: 'CASCADE',
  })
  warehouse?: Warehouse;

  @BelongsTo(() => Order, {
    foreignKey: 'order_id',
    onDelete: 'SET NULL',
  })
  order?: Order;

  @BelongsTo(() => User, {
    foreignKey: 'user_id',
    onDelete: 'SET NULL',
  })
  user?: User;
}
