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
import Order from './Order';
import Warehouse from './Warehouse';
import WarehouseJobItem from './WarehouseJobItem';

export type WarehouseJobStage =
  | 'pending_pick'
  | 'picking'
  | 'packing'
  | 'ready_for_dispatch'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

@Table({
  tableName: 'warehouse_jobs',
  timestamps: true,
  underscored: true,
})
export default class WarehouseJob extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Order)
  @Column({ type: DataType.BIGINT, allowNull: false })
  order_id!: number;

  @ForeignKey(() => Warehouse)
  @Column({ type: DataType.BIGINT, allowNull: true })
  warehouse_id!: number | null;

  @Column({
    type: DataType.ENUM(
      'pending_pick',
      'picking',
      'packing',
      'ready_for_dispatch',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ),
    defaultValue: 'pending_pick',
  })
  stage!: WarehouseJobStage;

  @Column({ type: DataType.BIGINT, allowNull: true })
  assigned_picker_id!: number | null;

  @Column({ type: DataType.BIGINT, allowNull: true })
  assigned_packer_id!: number | null;

  @Column({ type: DataType.BIGINT, allowNull: true })
  assigned_agent_id!: number | null;

  @Column({ type: DataType.DATE, allowNull: true })
  picking_started_at!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  picking_completed_at!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  packing_started_at!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  packing_completed_at!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  dispatch_at!: Date | null;

  @Column({ type: DataType.STRING(10), allowNull: true })
  delivery_code!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  delivery_code_expires_at!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  delivery_code_confirmed_at!: Date | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  box_label_printed!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  box_label_printed_at!: Date | null;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  cash_collected!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  qa_flagged!: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  qa_notes!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  admin_notes!: string | null;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => Order)
  order!: Order;

  @BelongsTo(() => Warehouse)
  warehouse!: Warehouse;

  @HasMany(() => WarehouseJobItem)
  items!: WarehouseJobItem[];
}
