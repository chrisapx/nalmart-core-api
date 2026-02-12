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
import Category from './Category';
import ProductImage from './ProductImage';

@Table({
  tableName: 'products',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class Product extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

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
    type: DataType.TEXT,
    allowNull: true,
  })
  description!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  short_description!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  sku!: string;

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
    type: DataType.UUID,
    allowNull: true,
  })
  category_id!: string;

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

  @HasMany(() => ProductImage)
  images!: ProductImage[];
}
