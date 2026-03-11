import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'delivery_categories',
  timestamps: true,
  underscored: true,
})
export default class DeliveryCategory extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Category name (e.g., "Normal Delivery", "Instant Delivery")',
  })
  name!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique slug for the category (e.g., "normal", "instant")',
  })
  slug!: string;

  @Column({
    type: DataType.ENUM('normal', 'instant', 'express', 'scheduled'),
    allowNull: false,
    defaultValue: 'normal',
    comment: 'Type of delivery category',
  })
  type!: 'normal' | 'instant' | 'express' | 'scheduled';

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Default per-kilometer rate in UGX for this category',
  })
  default_per_km_rate!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Description of this delivery category',
  })
  description?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Estimated delivery time in hours',
  })
  estimated_hours?: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this category is currently active',
  })
  is_active!: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Sort order for display (lower = higher priority)',
  })
  sort_order!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
