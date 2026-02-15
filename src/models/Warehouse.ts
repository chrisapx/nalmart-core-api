import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  HasMany,
} from 'sequelize-typescript';
import Inventory from './Inventory';
import InventoryHistory from './InventoryHistory';

@Table({
  tableName: 'warehouses',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class Warehouse extends Model {
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
    comment: 'Warehouse name (e.g., Main Warehouse, Regional HQ)',
  })
  name!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Warehouse code (e.g., WH-001, WH-002)',
  })
  code!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Full warehouse address',
  })
  address!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  city!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  state!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  postal_code!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  country!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    comment: 'Contact phone number',
  })
  phone!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Contact email',
  })
  email!: string;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Latitude for geolocation',
  })
  latitude!: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Longitude for geolocation',
  })
  longitude!: number;

  @Column({
    type: DataType.ENUM('primary', 'secondary', 'regional', 'distribution'),
    defaultValue: 'secondary',
    comment: 'Warehouse type/priority',
  })
  warehouse_type!: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Maximum capacity in units',
  })
  max_capacity!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    comment: 'Is warehouse active and accepting inventory',
  })
  is_active!: boolean;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Additional metadata (hours, manager info, etc.)',
  })
  metadata!: Record<string, any>;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  @DeletedAt
  deleted_at!: Date;

  // Relationships
  @HasMany(() => Inventory, {
    foreignKey: 'warehouse_id',
    onDelete: 'CASCADE',
  })
  inventories?: Inventory[];

  @HasMany(() => InventoryHistory, {
    foreignKey: 'warehouse_id',
    onDelete: 'CASCADE',
  })
  inventory_histories?: InventoryHistory[];
}
