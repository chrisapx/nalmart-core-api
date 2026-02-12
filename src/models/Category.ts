import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  HasMany,
} from 'sequelize-typescript';
import Product from './Product';

@Table({
  tableName: 'categories',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class Category extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description!: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Parent category ID for nested categories',
  })
  parent_id!: number;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: 'S3 image URL',
  })
  image_url!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  sort_order!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  @DeletedAt
  deleted_at!: Date;

  // Associations
  @HasMany(() => Product)
  products!: Product[];
}
