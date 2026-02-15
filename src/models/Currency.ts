import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'currencies',
  timestamps: true,
  underscored: true,
})
export default class Currency extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    unique: true,
    comment: 'ISO 4217 currency code (e.g., USD, EUR, GBP)',
  })
  code!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Full currency name (e.g., US Dollar)',
  })
  name!: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    comment: 'Currency symbol (e.g., $, €, £)',
  })
  symbol!: string;

  @Column({
    type: DataType.ENUM('before', 'after'),
    defaultValue: 'before',
    comment: 'Symbol position relative to amount',
  })
  symbol_position!: string;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 1,
    comment: 'Exchange rate relative to base currency',
  })
  exchange_rate!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    comment: 'Is this the default/base currency',
  })
  is_default!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    comment: 'Is this currency currently active',
  })
  is_active!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 2,
    comment: 'Number of decimal places (0-4)',
  })
  decimal_places!: number;

  @Column({
    type: DataType.STRING(5),
    defaultValue: ',',
    comment: 'Thousands separator',
  })
  thousands_separator!: string;

  @Column({
    type: DataType.STRING(5),
    defaultValue: '.',
    comment: 'Decimal separator',
  })
  decimal_separator!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Notes about this currency',
  })
  notes!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
