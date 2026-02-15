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
import Product from './Product';

@Table({
  tableName: 'favorites',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'product_id'],
      name: 'unique_user_product_favorite',
    },
  ],
})
export default class Favorite extends Model {
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

  @ForeignKey(() => Product)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  product_id!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'User notes about why they favorited this product',
  })
  notes?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Expected purchase date for this item',
  })
  expected_purchase_date?: Date;

  @Column({
    type: DataType.ENUM('high', 'medium', 'low'),
    defaultValue: 'medium',
    comment: 'Priority level of this favorite',
  })
  priority!: string;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Product)
  product!: Product;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
