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
import Inventory from './Inventory';
import InventoryHistory from './InventoryHistory';

@Table({
  tableName: 'inventory_batches',
  timestamps: true,
  underscored: true,
  comment: 'Batch/lot tracking with expiry dates and cost history',
})
export default class InventoryBatch extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Inventory)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Reference to inventory',
  })
  inventory_id!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Batch/lot number (e.g., LOT-2026-001)',
  })
  batch_number!: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Initial quantity received in this batch',
  })
  quantity_received!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Quantity sold/used from this batch',
  })
  quantity_sold!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Quantity damaged/lost from this batch',
  })
  quantity_damaged!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: 'Current stock (received - sold - damaged)',
  })
  quantity_remaining!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Cost per unit for this batch',
  })
  cost_per_unit!: number;

  @Column({
    type: DataType.DECIMAL(14, 2),
    allowNull: false,
    comment: 'Total batch cost (quantity_received * cost_per_unit)',
  })
  total_cost!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Date batch was received',
  })
  received_date!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Manufacturer/production date',
  })
  manufacture_date!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Expiry/use-by date (null if never expires)',
  })
  expiry_date!: Date;

  @Column({
    type: DataType.ENUM('active', 'expired', 'recall', 'archived'),
    defaultValue: 'active',
    comment: 'Batch status',
  })
  status!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Supplier/vendor name',
  })
  supplier!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Purchase order or reference number',
  })
  reference_number!: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Additional metadata (certification, test results, etc.)',
  })
  metadata!: Record<string, any>;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Notes about this batch',
  })
  notes!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relationships
  @BelongsTo(() => Inventory, {
    foreignKey: 'inventory_id',
    onDelete: 'CASCADE',
  })
  inventory?: Inventory;

  @HasMany(() => InventoryHistory, {
    foreignKey: 'batch_id',
    onDelete: 'SET NULL',
  })
  histories?: InventoryHistory[];

  // Helper methods
  isExpired(): boolean {
    if (!this.expiry_date) return false;
    return new Date() > this.expiry_date;
  }

  getDaysToExpiry(): number | null {
    if (!this.expiry_date) return null;
    const now = new Date();
    const diff = this.expiry_date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
