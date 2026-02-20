import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import Cart from './Cart';
import Product from './Product';

@Table({
  tableName: 'cart_items',
  timestamps: true,
  underscored: true,
})
export default class CartItem extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Cart)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  cart_id!: number;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  product_id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  quantity!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Price per unit at time of adding to cart',
  })
  unit_price!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total price = quantity * unit_price',
  })
  total_price!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Variant selections (size, color, etc) as JSON',
  })
  variant_data!: string | null;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relationships
  @BelongsTo(() => Cart)
  cart!: Cart;

  @BelongsTo(() => Product)
  product!: Product;
}
