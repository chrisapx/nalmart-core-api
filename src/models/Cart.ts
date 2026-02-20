import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import User from './User';
import CartItem from './CartItem';

@Table({
  tableName: 'carts',
  timestamps: true,
  underscored: true,
})
export default class Cart extends Model {
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
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Total number of items in cart',
  })
  total_items!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Total price of all items in cart',
  })
  total_price!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relationships
  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => CartItem)
  CartItems!: CartItem[];
}
