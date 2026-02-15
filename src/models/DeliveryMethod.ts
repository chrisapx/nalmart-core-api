import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
import Delivery from './Delivery';

@Table({
  tableName: 'delivery_methods',
  timestamps: true,
  underscored: true,
})
export default class DeliveryMethod extends Model {
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
    comment: 'e.g., Standard, Express, Overnight',
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.ENUM('standard', 'express', 'overnight', 'same_day', 'pickup'),
    allowNull: false,
  })
  type!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Base shipping fee',
  })
  base_fee!: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 0,
    comment: 'Fee per kg of weight',
  })
  fee_per_kg!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Maximum fee cap (if applicable)',
  })
  max_fee?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: 'Estimated delivery time in days',
  })
  delivery_days!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Free shipping threshold amount',
  })
  free_shipping_threshold?: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Coverage areas/regions served by this method',
  })
  coverage_areas?: Record<string, boolean>;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Weight limit in kg',
  })
  max_weight?: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
    comment: 'Display order in UI',
  })
  display_order!: number;

  @HasMany(() => Delivery)
  deliveries!: Delivery[];

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
