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
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  role_id!: string;

  @ForeignKey(() => Permission)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  permission_id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'ID of user who assigned this permission',
  })
  assigned_by!: string;

  @CreatedAt
  created_at!: Date;
}
