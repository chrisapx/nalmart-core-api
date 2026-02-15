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
import Order from './Order';
import User from './User';

@Table({
  tableName: 'reserved_inventory',
  timestamps: true,
  underscored: true,
  comment: 'Inventory reserved for pending orders',
})
export default class ReservedInventory extends Model {
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

  @ForeignKey(() => Order)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Order this inventory is reserved for',
  })
  order_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'User who made the reservation',
  })
  reserved_by!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Quantity reserved',
  })
  quantity_reserved!: number;

  @Column({
    type: DataType.ENUM('pending', 'allocated', 'fulfilled', 'released', 'cancelled'),
    defaultValue: 'pending',
    comment: 'Reservation status',
  })
  status!: string;

  @Column({
    type: DataType.ENUM('order_pending', 'awaiting_payment', 'transit', 'delivered', 'cancelled'),
    defaultValue: 'order_pending',
    comment: 'Order status related to this reservation',
  })
  order_status!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When inventory was allocated/picked',
  })
  allocated_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When order was fulfilled/shipped',
  })
  fulfilled_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When reservation expires (if not fulfilled)',
  })
  expires_at!: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is part of a backorder',
  })
  is_backorder!: boolean;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Price at time of reservation',
  })
  reserved_price!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Notes about the reservation',
  })
  notes!: string;

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

  @BelongsTo(() => Order, {
    foreignKey: 'order_id',
    onDelete: 'CASCADE',
  })
  order?: Order;

  @BelongsTo(() => User, {
    foreignKey: 'reserved_by',
    onDelete: 'SET NULL',
  })
  reserved_user?: User;
}
