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
import Product from './Product';

@Table({
  tableName: 'product_images',
  timestamps: true,
  underscored: true,
})
export default class ProductImage extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  product_id!: string;

  @Column({
    type: DataType.STRING(1000),
    allowNull: false,
    comment: 'S3 URL - no file storage, URLs only',
  })
  url!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  alt_text!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'File size in bytes',
  })
  size!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  mime_type!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_primary!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  sort_order!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Image width in pixels',
  })
  width!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Image height in pixels',
  })
  height!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => Product)
  product!: Product;
}
