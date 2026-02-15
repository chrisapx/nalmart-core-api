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
import DeliveryMethod from './DeliveryMethod';
import DeliveryAddress from './DeliveryAddress';

@Table({
  tableName: 'deliveries',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class Delivery extends Model {
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
    unique: true,
    comment: 'Each order has one delivery',
  })
  order_id!: number;

  @ForeignKey(() => DeliveryMethod)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  delivery_method_id!: number;

  @ForeignKey(() => DeliveryAddress)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  delivery_address_id!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Tracking number from carrier',
  })
  tracking_number?: string;

  @Column({
    type: DataType.ENUM('pending', 'processing', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled', 'returned'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Calculated shipping fee',
  })
  shipping_fee!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Insurance cost if applicable',
  })
  insurance_cost?: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Total delivery cost (shipping + insurance + taxes)',
  })
  total_cost!: number;

  @Column({
    type: DataType.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total weight in kg',
  })
  total_weight!: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Latitude of current location',
  })
  current_latitude?: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Longitude of current location',
  })
  current_longitude?: number;

  @Column({
    type: DataType.ENUM('standard', 'signature_required', 'POD'),
    defaultValue: 'standard',
    comment: 'Proof of delivery type',
  })
  delivery_type!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Estimated delivery date',
  })
  estimated_delivery_date?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Actual delivery date',
  })
  delivered_at?: Date;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Name of person who received the package',
  })
  received_by?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Delivery notes/comments',
  })
  notes?: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Tracking history with timestamps',
  })
  tracking_history?: Array<{
    status: string;
    timestamp: Date;
    location?: string;
    notes?: string;
  }>;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Carrier name (e.g., FedEx, UPS, DHL)',
  })
  carrier_name?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Carrier reference ID',
  })
  carrier_reference?: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Is delivery eligible for return',
  })
  is_returnable!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 30,
    comment: 'Return window in days',
  })
  return_window_days!: number;

  @BelongsTo(() => Order)
  order!: Order;

  @BelongsTo(() => DeliveryMethod)
  delivery_method!: DeliveryMethod;

  @BelongsTo(() => DeliveryAddress)
  delivery_address!: DeliveryAddress;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
