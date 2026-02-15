import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
import Promotion from './Promotion';

@Table({
  tableName: 'campaigns',
  timestamps: true,
  underscored: true,
})
export default class Campaign extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  banner_image_url?: string;

  @Column({
    type: DataType.ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'),
    allowNull: false,
  })
  discount_type!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Discount value (% or fixed amount)',
  })
  discount_value!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Minimum order amount to qualify',
  })
  min_order_amount?: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Maximum discount cap',
  })
  max_discount?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  start_date!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  end_date!: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Maximum number of times code can be used',
  })
  max_uses?: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Current usage count',
  })
  usage_count!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Limit per customer',
  })
  max_uses_per_customer?: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @Column({
    type: DataType.ENUM('all_products', 'specific_products', 'specific_categories'),
    defaultValue: 'all_products',
  })
  applicability!: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Array of product or category IDs if specific',
  })
  applicable_items?: number[];

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'User segment targeting (e.g., new customers, VIP)',
  })
  target_segments?: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Stackable with other promotions',
  })
  is_stackable!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Display priority',
  })
  priority!: number;

  @HasMany(() => Promotion)
  promotions!: Promotion[];

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
