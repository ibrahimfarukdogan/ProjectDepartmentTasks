import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';

interface NotificationAttributes {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string; // e.g. "task", "comment", "system"
  metadata?: object;
  read: boolean;
  createdAt: Date;
  url: string;
}

interface NotificationCreationAttributes
  extends Optional<NotificationAttributes, 'id' | 'read' | 'metadata' | 'createdAt'> {}

class Notifications extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes {
  public id!: number;
  public user_id!: number;
  title!: string;
  public message!: string;
  public type!: string;
  public metadata?: object;
  public read!: boolean;
  public createdAt!: Date;
  public url!: string;
}

Notifications.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    modelName: 'Notifications',
    timestamps: false,
  }
);

export default Notifications;
