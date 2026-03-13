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

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

@Table({
  tableName: 'store_applications',
  timestamps: true,
  underscored: true,
})
export default class StoreApplication extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, allowNull: false })
  applicant_id!: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  store_name!: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  description?: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  email?: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  phone?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  business_type?: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  website_url?: string;

  @Column({ type: DataType.STRING(200), allowNull: true })
  logo_url?: string;

  /** JSON: any extra info the applicant provides */
  @Column({ type: DataType.JSON, allowNull: true })
  metadata?: Record<string, unknown>;

  @Column({
    type: DataType.ENUM('pending', 'approved', 'rejected', 'under_review'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status!: ApplicationStatus;

  /** Admin/reviewer who acted on this application */
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT, allowNull: true })
  reviewed_by?: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  review_notes?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  reviewed_at?: Date;

  /** Set to the created store id once approved */
  @Column({ type: DataType.BIGINT, allowNull: true })
  store_id?: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => User, { foreignKey: 'applicant_id', as: 'applicant', constraints: false })
  applicant!: User;

  @BelongsTo(() => User, { foreignKey: 'reviewed_by', as: 'reviewer', constraints: false })
  reviewer?: User;
}
