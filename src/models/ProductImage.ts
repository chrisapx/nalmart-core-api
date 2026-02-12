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
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  product_id!: number;

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
    type: DataType.ENUM('cover', 'gallery', 'demo'),
    defaultValue: 'gallery',
    comment: 'Type of image: cover (main product image), gallery (additional product images), demo (usage demonstration images)',
  })
  image_type!: 'cover' | 'gallery' | 'demo';

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
