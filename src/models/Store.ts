import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'stores',
  timestamps: true,
  underscored: true,
})
export default class Store extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  logo_url?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  street?: string;

  @Column({
    type: DataType.STRING(120),
    allowNull: true,
  })
  city?: string;

  @Column({
    type: DataType.STRING(120),
    allowNull: true,
  })
  state?: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
  })
  postal_code?: string;

  @Column({
    type: DataType.STRING(120),
    allowNull: false,
    defaultValue: 'Uganda',
  })
  country!: string;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
  })
  latitude?: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
  })
  longitude?: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1500,
    comment: 'UGX fee charged per kilometer for this store',
  })
  per_km_delivery_fees!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  base_delivery_fee!: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Set true for the official Nalmart store currently used for all orders',
  })
  is_official!: boolean;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata?: Record<string, unknown>;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
