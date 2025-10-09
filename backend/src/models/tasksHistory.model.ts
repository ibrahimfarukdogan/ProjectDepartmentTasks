import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';

export interface TaskHistoryAttributes  {
  id: number;
  task_id: number;
  creator_id: number;
  authorized_user_id: number;
  assigned_dept_id: number;
  assigned_user_id?: number;

  title: string;
  description?: string;
  status: 'open' | 'inprogress' | 'done' | 'approved' | 'cancelled';

  start_date?: Date;
  finish_date?: Date;
  created_at?: Date;
  updated_at?: Date;

  requester_name: string;
  requester_mail?: string;
  requester_phone?: number;
  requester_rank: 'milletvekili' | 'kaymakamlik' | 'muhtarlik' | 'diger';
}

interface TaskCreationAttributes extends Optional<TaskHistoryAttributes , 'id' | 'assigned_user_id' | 'description' | 'start_date' | 'finish_date' | 'created_at' | 'updated_at' | 'requester_mail' | 'requester_phone'> {}

class TasksHistory extends Model<TaskHistoryAttributes , TaskCreationAttributes> implements TaskHistoryAttributes  {
  public id!: number;
  public task_id!: number;
  public creator_id!: number;
  public authorized_user_id!: number;
  public assigned_dept_id!: number;
  public assigned_user_id?: number;

  public title!: string;
  public description?: string;
  public status!: TaskHistoryAttributes ['status'];

  public start_date?: Date;
  public finish_date?: Date;
  public created_at?: Date;
  public updated_at?: Date;

  public requester_name!: string;
  public requester_mail?: string;
  public requester_phone?: number;
  public requester_rank!: TaskHistoryAttributes ['requester_rank'];
}

TasksHistory.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
    creator_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  authorized_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assigned_user_id: {
    type: DataTypes.INTEGER,
  },
  assigned_dept_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('open', 'inprogress', 'done', 'approved', 'cancelled'),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATE,
  },
  finish_date: {
    type: DataTypes.DATE,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  requester_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  requester_mail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true,
    },
  },
  requester_phone: {
    type: DataTypes.BIGINT,
  },
  requester_rank: {
    type: DataTypes.ENUM('milletvekili', 'kaymakamlik', 'muhtarlik', 'diger'),
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'TasksHistory',
  tableName: 'taskshistory',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default TasksHistory;
