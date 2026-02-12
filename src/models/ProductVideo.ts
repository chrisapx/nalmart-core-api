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
  tableName: 'product_videos',
  timestamps: true,
  underscored: true,
})
export default class ProductVideo extends Model {
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
    comment: 'S3 URL or external video URL (YouTube, Vimeo, etc.)',
  })
  url!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description!: string;

  @Column({
    type: DataType.STRING(1000),
    allowNull: true,
    comment: 'Thumbnail/preview image URL',
  })
  thumbnail_url!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Video duration in seconds',
  })
  duration!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'File size in bytes (for uploaded videos)',
  })
  size!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  mime_type!: string;

  @Column({
    type: DataType.ENUM('demo', 'tutorial', 'review', 'unboxing'),
    defaultValue: 'demo',
    comment: 'Type of video content',
  })
  video_type!: 'demo' | 'tutorial' | 'review' | 'unboxing';

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  sort_order!: number;

  @Column({
    type: DataType.ENUM('local', 'youtube', 'vimeo', 'external'),
    defaultValue: 'local',
    comment: 'Source platform of the video',
  })
  platform!: 'local' | 'youtube' | 'vimeo' | 'external';

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'External video ID (for YouTube, Vimeo, etc.)',
  })
  external_id!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => Product)
  product!: Product;
}
