import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from 'sequelize-typescript';
import User from './User';
import Permission from './Permission';
import UserRole from './UserRole';
import RolePermission from './RolePermission';

@Table({
  tableName: 'roles',
  timestamps: true,
  underscored: true,
})
export default class Role extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
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

  // Associations
  @BelongsToMany(() => User, () => UserRole)
  users!: User[];

  @BelongsToMany(() => Permission, () => RolePermission)
  permissions!: Permission[];
}
