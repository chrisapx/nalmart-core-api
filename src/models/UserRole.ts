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
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id!: string;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  role_id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'ID of user who assigned this role',
  })
  assigned_by!: string;

  @CreatedAt
  created_at!: Date;
}
