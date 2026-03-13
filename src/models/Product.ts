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
  HasOne,
} from 'sequelize-typescript';
import Category from './Category';
import ProductImage from './ProductImage';
import ProductVideo from './ProductVideo';
import Inventory from './Inventory';
import Store from './Store';
import User from './User';
import ProductAuditLog from './ProductAuditLog';

@Table({
  tableName: 'products',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class Product extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
    comment: 'Rich text description with images and formatting',
  })
  description!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  short_description!: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
    comment: 'Rich text product features with formatting',
  })
  features!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    unique: true,
    comment: 'Format: SKU-XXXXXXXXXXXXXX (14 random digits) - Warehouse inventory ID embedded in QR Code',
  })
  sku!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    comment: 'Format: JUG-XXXXXXXXXXXXXX - Groups same products in stock, used for stock count display',
  })
  jug!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  price!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Original price before discount',
  })
  compare_at_price!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Cost price for profit calculation',
  })
  cost_price!: number;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  category_id!: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Which store this product belongs to (null = Nalmart official)',
  })
  store_id!: number | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'User who first created this product',
  })
  created_by!: number | null;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'User who last updated this product',
  })
  updated_by!: number | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  stock_quantity!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Alert when stock falls below this number',
  })
  low_stock_threshold!: number;

  @Column({
    type: DataType.ENUM('in_stock', 'out_of_stock', 'backorder'),
    defaultValue: 'in_stock',
  })
  stock_status!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_featured!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the product is published and visible to customers',
  })
  is_published!: boolean;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  brand!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    comment: 'Whether product is eligible for return',
  })
  eligible_for_return!: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Return policy details including time limits and conditions',
  })
  return_policy!: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Admin-controlled flag for free delivery eligibility',
  })
  free_delivery?: boolean;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'SEO meta title',
  })
  meta_title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'SEO meta description',
  })
  meta_description!: string;

  @Column({
    type: DataType.DECIMAL(3, 1),
    defaultValue: 0,
    comment: 'Average rating 0-5',
  })
  rating!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  review_count!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  view_count!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  sales_count!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Weight in kg',
  })
  weight!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Dimensions in cm: {length, width, height}',
  })
  dimensions!: { length: number; width: number; height: number };

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Additional metadata',
  })
  metadata!: Record<string, unknown>;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  @DeletedAt
  deleted_at!: Date;

  // Associations
  @BelongsTo(() => Category)
  category!: Category;

  @BelongsTo(() => Store, { foreignKey: 'store_id', as: 'store', constraints: false })
  store?: Store;

  @BelongsTo(() => User, { foreignKey: 'created_by', as: 'createdByUser', constraints: false })
  createdByUser?: User;

  @BelongsTo(() => User, { foreignKey: 'updated_by', as: 'updatedByUser', constraints: false })
  updatedByUser?: User;

  @HasMany(() => ProductImage)
  images!: ProductImage[];

  @HasMany(() => ProductVideo)
  videos!: ProductVideo[];

  @HasOne(() => Inventory, { foreignKey: 'product_id', as: 'inventory' })
  inventory?: Inventory;

  @HasMany(() => ProductAuditLog, { foreignKey: 'product_id', as: 'auditLogs' })
  auditLogs?: ProductAuditLog[];
}
