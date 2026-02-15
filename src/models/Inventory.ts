import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import Product from './Product';
import Warehouse from './Warehouse';
import InventoryBatch from './InventoryBatch';
import InventoryHistory from './InventoryHistory';
import InventoryAlert from './InventoryAlert';
import ReservedInventory from './ReservedInventory';

@Table({
  tableName: 'inventory',
  timestamps: true,
  underscored: true,
  comment: 'Core inventory tracking per product per warehouse',
})
export default class Inventory extends Model {
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
    comment: 'Reference to product',
  })
  product_id!: number;

  @ForeignKey(() => Warehouse)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Reference to warehouse',
  })
  warehouse_id!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Current stock quantity',
  })
  quantity_on_hand!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Reserved/allocated inventory for pending orders',
  })
  quantity_reserved!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Computed field: quantity_on_hand - quantity_reserved',
  })
  quantity_available!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Stock in transit/receiving',
  })
  quantity_in_transit!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Defective/damaged stock',
  })
  quantity_defective!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Minimum stock level',
  })
  reorder_level!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Maximum recommended stock',
  })
  reorder_quantity!: number;

  @Column({
    type: DataType.ENUM('in_stock', 'low_stock', 'out_of_stock', 'discontinued'),
    defaultValue: 'in_stock',
    comment: 'Current stock status',
  })
  stock_status!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Cost per unit for this inventory',
  })
  cost_per_unit!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Last time inventory was counted/verified',
  })
  last_counted_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Last time reorder alert was sent',
  })
  last_alert_at!: Date;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Location info (aisle, shelf, bin, etc.)',
  })
  location!: Record<string, any>;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Notes about this inventory',
  })
  notes!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relationships
  @BelongsTo(() => Product, {
    foreignKey: 'product_id',
    onDelete: 'CASCADE',
  })
  product?: Product;

  @BelongsTo(() => Warehouse, {
    foreignKey: 'warehouse_id',
    onDelete: 'CASCADE',
  })
  warehouse?: Warehouse;

  @HasMany(() => InventoryBatch, {
    foreignKey: 'inventory_id',
    onDelete: 'CASCADE',
  })
  batches?: InventoryBatch[];

  @HasMany(() => InventoryHistory, {
    foreignKey: 'inventory_id',
    onDelete: 'CASCADE',
  })
  histories?: InventoryHistory[];

  @HasMany(() => InventoryAlert, {
    foreignKey: 'inventory_id',
    onDelete: 'CASCADE',
  })
  alerts?: InventoryAlert[];

  @HasMany(() => ReservedInventory, {
    foreignKey: 'inventory_id',
    onDelete: 'CASCADE',
  })
  reservations?: ReservedInventory[];

  // Helper method
  getAvailableQuantity(): number {
    return this.quantity_on_hand - this.quantity_reserved;
  }
}
