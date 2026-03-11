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
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Description of this delivery category',
  })
  description?: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Base delivery fee in UGX',
  })
  base_fee!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Additional fee per kilometer in UGX',
  })
  per_km_fee!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: 'Estimated delivery time in days',
  })
  estimated_delivery_days!: number;

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
