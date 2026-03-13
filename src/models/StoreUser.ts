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
import User from './User';

@Table({
  tableName: 'store_users',
  timestamps: true,
  underscored: true,
})
export default class StoreUser extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  store_id!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  user_id!: number;

  @Column({
    type: DataType.ENUM('owner', 'manager', 'vendor'),
    allowNull: false,
    defaultValue: 'vendor',
    comment: 'owner = full control, manager = edit, vendor = read + limited edit',
  })
  role!: 'owner' | 'manager' | 'vendor';

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active!: boolean;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => Store)
  store!: Store;

  @BelongsTo(() => User)
  user!: User;
}
