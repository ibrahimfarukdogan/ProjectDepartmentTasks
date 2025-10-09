import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';

interface ActivityLogAttributes {
  id: number;
  user_id: number;
  action: string; // e.g. 'create_task', 'delete_user'
  targetType: string; // e.g. 'task', 'user', 'department'
  targetId?: number;
  metadata?: object;
  createdAt: Date;
}

interface ActivityLogCreationAttributes
  extends Optional<ActivityLogAttributes, 'id' | 'targetId' | 'metadata' | 'createdAt'> {}

class ActivityLogs extends Model<ActivityLogAttributes, ActivityLogCreationAttributes>
  implements ActivityLogAttributes {
  public id!: number;
  public user_id!: number;
  public action!: string;
  public targetType!: string;
  public targetId?: number;
  public metadata?: object;
  public createdAt!: Date;
}

ActivityLogs.init(
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
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetId: {
      type: DataTypes.INTEGER,
    },
    metadata: {
      type: DataTypes.JSON,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ActivityLogs',
    tableName: 'activity_logs',
    timestamps: false,
  }
);

export default ActivityLogs;
