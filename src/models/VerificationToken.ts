import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  BeforeCreate,
} from 'sequelize-typescript';
import crypto from 'crypto';
import User from './User';

/**
 * VerificationToken Model
 * 
 * Stores email and phone verification codes.
 * Tokens expire after a set time (default: 15 minutes).
 */
@Table({
  tableName: 'verification_tokens',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token'] },
    { fields: ['type'] },
    { fields: ['expires_at'] },
  ],
})
export default class VerificationToken extends Model {
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
    type: DataType.STRING(255),
    allowNull: false,
  })
  token!: string;

  @Column({
    type: DataType.ENUM('email', 'phone', 'password_reset', '2fa'),
    allowNull: false,
  })
  type!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Email or phone number this token was sent to',
  })
  sent_to!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expires_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  used_at!: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    comment: 'Number of failed verification attempts',
  })
  attempts!: number;

  @CreatedAt
  created_at!: Date;

  // Associations
  @BelongsTo(() => User)
  user!: User;

  // Hooks
  @BeforeCreate
  static async generateToken(token: VerificationToken) {
    if (!token.token) {
      // Generate 6-digit code for email/phone, 32-char token for password reset
      if (token.type === 'email' || token.type === 'phone' || token.type === '2fa') {
        token.token = Math.floor(100000 + Math.random() * 900000).toString();
      } else {
        token.token = crypto.randomBytes(32).toString('hex');
      }
    }

    if (!token.expires_at) {
      // Email/Phone codes expire in 15 minutes
      // Password reset tokens expire in 1 hour
      const expiryMinutes = token.type === 'password_reset' ? 60 : 15;
      token.expires_at = new Date(Date.now() + expiryMinutes * 60 * 1000);
    }
  }

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  isUsed(): boolean {
    return !!this.used_at;
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isUsed() && this.attempts < 5;
  }

  incrementAttempts(): void {
    this.attempts += 1;
  }

  markAsUsed(): void {
    this.used_at = new Date();
  }
}
