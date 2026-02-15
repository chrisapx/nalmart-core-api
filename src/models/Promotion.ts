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
import Campaign from './Campaign';

@Table({
  tableName: 'promotions',
  timestamps: true,
  underscored: true,
})
export default class Promotion extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Campaign)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  campaign_id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  code!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Discount value specific to this promotion code',
  })
  discount_value!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  usage_count!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Max uses for this specific code',
  })
  max_uses?: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deleted_at?: Date;

  @BelongsTo(() => Campaign)
  campaign!: Campaign;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
