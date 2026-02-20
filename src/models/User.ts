import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  BeforeCreate,
  BeforeUpdate,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import bcrypt from 'bcrypt';
import Role from './Role';
import UserRole from './UserRole';
import LoginSession from './LoginSession';
import VerificationToken from './VerificationToken';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export default class User extends Model {
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
  first_name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  last_name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  email!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  password!: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  phone!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  avatar_url!: string;

  @Column({
    type: DataType.ENUM('active', 'inactive', 'suspended', 'deleted'),
    defaultValue: 'active',
  })
  status!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  email_verified!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  email_verified_at!: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  phone_verified!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  phone_verified_at!: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Account is verified if email OR phone is verified',
  })
  account_verified!: boolean;

  @Column({
    type: DataType.ENUM('email', 'phone', 'google', 'none'),
    defaultValue: 'none',
    comment: 'Primary verification method used',
  })
  verification_method!: string;

  // Google OAuth fields
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
  })
  google_id!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  google_email!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  google_avatar!: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Google OAuth access token for API calls on behalf of user',
  })
  google_access_token!: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Google OAuth refresh token for token renewal',
  })
  google_refresh_token!: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  last_login_at!: Date;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  last_login_ip!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  @DeletedAt
  deleted_at!: Date;

  // Associations
  @BelongsToMany(() => Role, () => UserRole)
  roles!: Role[];

  @HasMany(() => LoginSession)
  sessions!: LoginSession[];

  @HasMany(() => VerificationToken)
  verificationTokens!: VerificationToken[];

  // Hooks
  @BeforeCreate
  static async hashPassword(user: User) {
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  }

  @BeforeUpdate
  static async hashPasswordOnUpdate(user: User) {
    if (user.changed('password') && user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  }

  // Instance methods
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}
