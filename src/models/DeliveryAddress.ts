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
import User from './User';

@Table({
  tableName: 'delivery_addresses',
  timestamps: true,
  underscored: true,
})
export default class DeliveryAddress extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  user_id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  full_name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  address_line_1!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  address_line_2?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  city!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  state!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  postal_code!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  country!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  phone!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Is default shipping address for user',
  })
  is_default!: boolean;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Latitude for geolocation',
  })
  latitude?: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Longitude for geolocation',
  })
  longitude?: number;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  formatted_address?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  place_id?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  vicinity?: string;

  @Column({
    type: DataType.STRING(32),
    allowNull: true,
    defaultValue: 'manual',
  })
  location_source?: string;

  @Column({
    type: DataType.DECIMAL(10, 3),
    allowNull: true,
    comment: 'Cached distance in KM from official store',
  })
  distance_km_from_store?: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  distance_calculated_at?: Date;

  @BelongsTo(() => User)
  user!: User;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
