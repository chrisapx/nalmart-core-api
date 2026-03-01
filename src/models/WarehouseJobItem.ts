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
import WarehouseJob from './WarehouseJob';
import OrderItem from './OrderItem';

@Table({
  tableName: 'warehouse_job_items',
  timestamps: true,
  underscored: true,
})
export default class WarehouseJobItem extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => WarehouseJob)
  @Column({ type: DataType.BIGINT, allowNull: false })
  warehouse_job_id!: number;

  @ForeignKey(() => OrderItem)
  @Column({ type: DataType.BIGINT, allowNull: false })
  order_item_id!: number;

  @Column({ type: DataType.BIGINT, allowNull: false })
  product_id!: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  product_name!: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  product_sku!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  quantity_expected!: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  quantity_picked!: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  quantity_packed!: number;

  @Column({
    type: DataType.ENUM('pending', 'picked', 'missing', 'damaged'),
    defaultValue: 'pending',
  })
  pick_status!: 'pending' | 'picked' | 'missing' | 'damaged';

  @Column({
    type: DataType.ENUM('pending', 'packed', 'missing', 'flagged'),
    defaultValue: 'pending',
  })
  pack_status!: 'pending' | 'packed' | 'missing' | 'flagged';

  @Column({ type: DataType.TEXT, allowNull: true })
  pick_notes!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  pack_notes!: string | null;

  @Column({ type: DataType.BIGINT, allowNull: true })
  picked_by!: number | null;

  @Column({ type: DataType.BIGINT, allowNull: true })
  packed_by!: number | null;

  @Column({ type: DataType.DATE, allowNull: true })
  picked_at!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  packed_at!: Date | null;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => WarehouseJob)
  warehouse_job!: WarehouseJob;

  @BelongsTo(() => OrderItem)
  order_item!: OrderItem;
}
