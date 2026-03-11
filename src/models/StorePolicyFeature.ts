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
import Store from './Store';

@Table({
  tableName: 'store_policy_features',
  timestamps: true,
  underscored: true,
})
export default class StorePolicyFeature extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Store ID if feature is store-specific, null for global features',
  })
  store_id?: number;

  @BelongsTo(() => Store)
  store?: Store;

  @Column({
    type: DataType.ENUM(
      'buyer_protection',
      'returns',
      'delivery',
      'payment',
      'support',
      'warranty',
      'insurance',
      'guarantee',
    ),
    allowNull: false,
    comment: 'Type of feature',
  })
  type!:
    | 'buyer_protection'
    | 'returns'
    | 'delivery'
    | 'payment'
    | 'support'
    | 'warranty'
    | 'insurance'
    | 'guarantee';

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Feature title displayed to users',
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Feature description',
  })
  description?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Icon name (e.g., "Shield", "RefreshCw", "Truck")',
  })
  icon?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Value or detail of the feature (e.g., "30 Day Returns", "24/7")',
  })
  value?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this feature is currently active/enabled',
  })
  is_active!: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Display order (lower numbers appear first)',
  })
  sort_order!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
