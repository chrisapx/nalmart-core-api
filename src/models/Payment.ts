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
import Order from './Order';
import User from './User';

export type PaymentMethod =
  | 'cash_on_delivery'
  | 'mobile_money_mtn'
  | 'mobile_money_airtel'
  | 'card'
  | 'bank_transfer';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery:    'Cash on Delivery',
  mobile_money_mtn:   'MTN Mobile Money',
  mobile_money_airtel: 'Airtel Money',
  card:                'Credit / Debit Card',
  bank_transfer:       'Bank Transfer',
};

@Table({
  tableName: 'payments',
  timestamps: true,
  underscored: true,
})
export default class Payment extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Order)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  order_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  user_id!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
  })
  amount!: number;

  @Column({
    type: DataType.STRING(10),
    defaultValue: 'UGX',
  })
  currency!: string;

  @Column({
    type: DataType.ENUM(
      'cash_on_delivery',
      'mobile_money_mtn',
      'mobile_money_airtel',
      'card',
      'bank_transfer'
    ),
    allowNull: false,
  })
  method!: PaymentMethod;

  @Column({
    type: DataType.ENUM(
      'pending',
      'processing',
      'confirmed',
      'failed',
      'refunded',
      'cancelled'
    ),
    defaultValue: 'pending',
  })
  status!: PaymentStatus;

  /** Internal Nalmart reference — e.g. NLM-ABC123XYZ */
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    unique: true,
  })
  reference?: string;

  /** External gateway / telco transaction ID */
  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  provider_ref?: string;

  /** Phone used for MoMo payments */
  @Column({
    type: DataType.STRING(30),
    allowNull: true,
  })
  phone?: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata?: Record<string, unknown>;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  paid_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  failed_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  refunded_at?: Date;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
  })
  refund_amount?: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  refund_reason?: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // ── Associations ─────────────────────────────────────────────────────────

  @BelongsTo(() => Order)
  order!: Order;

  @BelongsTo(() => User)
  user!: User;
}
