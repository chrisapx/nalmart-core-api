import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  CreatedAt,
} from 'sequelize-typescript';
import User from './User';
import Role from './Role';

@Table({
  tableName: 'user_roles',
  timestamps: true,
  updatedAt: false,
  underscored: true,
})
export default class UserRole extends Model {
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

  @ForeignKey(() => Role)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  role_id!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'ID of user who assigned this role',
  })
  assigned_by!: number;

  @CreatedAt
  created_at!: Date;
}
