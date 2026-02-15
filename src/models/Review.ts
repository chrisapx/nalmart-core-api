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
import User from './User';

@Table({
  tableName: 'reviews',
  timestamps: true,
  underscored: true,
  comment: 'Product reviews from customers',
})
export default class Review extends Model {
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

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Linked user if logged in',
  })
  user_id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
    comment: 'Rating from 1-5 stars',
  })
  rating!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Review title/headline',
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    comment: 'Detailed review comment',
  })
  comment!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: 'Name of the reviewer',
  })
  customer_name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Email of the reviewer',
  })
  customer_email!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Is this a verified purchase',
  })
  is_verified_purchase!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Number of people who found this helpful',
  })
  helpful_count!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Number of people who found this unhelpful',
  })
  unhelpful_count!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Array of image URLs from S3',
  })
  image_urls!: string[];

  @Column({
    type: DataType.ENUM('pending', 'approved', 'rejected', 'hidden'),
    defaultValue: 'pending',
    comment: 'Moderation status of review',
  })
  status!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Admin notes for moderation',
  })
  admin_notes!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Date this review was approved',
  })
  approved_at!: Date;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'User ID of moderator who approved',
  })
  approved_by!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => Product)
  product!: Product;

  @BelongsTo(() => User)
  user!: User;
}
