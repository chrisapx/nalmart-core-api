import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import User from './User';
import OrderItem from './OrderItem';

@Table({
  tableName: 'orders',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class Order extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Human-readable 10-digit order number',
  })
  order_number!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  user_id!: number;

  @Column({
    type: DataType.ENUM(
      'pending',
      'processing',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'failed'
    ),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'),
    defaultValue: 'pending',
  })
  payment_status!: string;

  @Column({
    type: DataType.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  })
  fulfillment_status!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  tax_amount!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  shipping_amount!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  discount_amount!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Final total amount',
  })
  total_amount!: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: 'USD',
  })
  currency!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  coupon_code!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  payment_method!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  payment_transaction_id!: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Shipping address: {name, phone, address_line1, address_line2, city, state, postal_code, country}',
  })
  shipping_address!: Record<string, string>;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Billing address',
  })
  billing_address!: Record<string, string>;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  tracking_number!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  shipping_carrier!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  shipped_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  delivered_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  cancelled_at!: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  customer_notes!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  admin_notes!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  ip_address!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  user_agent!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  @DeletedAt
  deleted_at!: Date;

  // Associations
  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => OrderItem)
  items!: OrderItem[];
}
