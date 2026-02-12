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
import Product from './Product';

@Table({
  tableName: 'order_items',
  timestamps: true,
  underscored: true,
})
export default class OrderItem extends Model {
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

  @ForeignKey(() => Product)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  product_id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: 'Snapshot of product name at time of order',
  })
  product_name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Snapshot of SKU at time of order',
  })
  product_sku!: string;

  @Column({
    type: DataType.STRING(1000),
    allowNull: true,
    comment: 'Snapshot of product image URL',
  })
  product_image_url!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  quantity!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Price per unit at time of order',
  })
  unit_price!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Total: quantity * unit_price',
  })
  total_price!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Discount applied to this item',
  })
  discount_amount!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Additional item metadata',
  })
  metadata!: Record<string, unknown>;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => Order)
  order!: Order;

  @BelongsTo(() => Product)
  product!: Product;
}
