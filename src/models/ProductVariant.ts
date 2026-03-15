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
} from 'sequelize-typescript';
import Product from './Product';

@Table({
  tableName: 'product_variants',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class ProductVariant extends Model {
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
  })
  product_id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Unique SKU for this variant',
  })
  sku!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: 'Variant name/label (e.g., "Red - Large", "128GB - Black")',
  })
  variant_name!: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
    comment: 'Variant attributes as key-value pairs (e.g., {"color": "Red", "size": "Large"})',
  })
  attributes!: Record<string, string>;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Price adjustment from base product price (can be negative for discounts)',
  })
  price_adjustment!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Stock quantity for this specific variant',
  })
  stock_quantity!: number;

  @Column({
    type: DataType.STRING(1000),
    allowNull: true,
    comment: 'Variant-specific image URL (optional, falls back to product images)',
  })
  image_url!: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this variant is available for purchase',
  })
  is_available!: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Display order for this variant',
  })
  sort_order!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Weight in kg (optional, overrides product weight)',
  })
  weight!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Dimensions in cm: {length, width, height} (optional, overrides product dimensions)',
  })
  dimensions!: { length: number; width: number; height: number };

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  @DeletedAt
  deleted_at!: Date;

  // Associations
  @BelongsTo(() => Product)
  product!: Product;
}
