import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  CreatedAt,
} from 'sequelize-typescript';
import Role from './Role';
import Permission from './Permission';

@Table({
  tableName: 'role_permissions',
  timestamps: true,
  updatedAt: false,
  underscored: true,
})
export default class RolePermission extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  role_id!: number;

  @ForeignKey(() => Permission)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  permission_id!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'ID of user who assigned this permission',
  })
  assigned_by!: number;

  @CreatedAt
  created_at!: Date;
}
