import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  BeforeCreate,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import User from './User';

/**
 * LoginSession Model
 * 
 * Tracks active login sessions for audit and management.
 * Does NOT store JWT tokens - only metadata for tracking purposes.
 * JWT payload includes session_id to link to this record.
 */
@Table({
  tableName: 'login_sessions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['session_id'], unique: true },
    { fields: ['is_active'] },
    { fields: ['expires_at'] },
  ],
})
export default class LoginSession extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  session_id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  user_id!: number;

  // Device Information
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  device_fingerprint!: string;

  @Column({
    type: DataType.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
    defaultValue: 'unknown',
  })
  device_type!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  device_name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  browser!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  os!: string;

  // Network Information
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  ip_address!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  city!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  country!: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
  })
  country_code!: string;

  // Session Status
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expires_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  last_activity_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  revoked_at!: Date;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  revocation_reason!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Associations
  @BelongsTo(() => User)
  user!: User;

  // Hooks
  @BeforeCreate
  static generateSessionId(session: LoginSession) {
    if (!session.session_id) {
      session.session_id = uuidv4();
    }
  }

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  isValid(): boolean {
    return this.is_active && !this.isExpired();
  }

  toJSON() {
    const values = { ...this.get() };
    return values;
  }
}
