import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import { ActivityLogs, Departments, TasksHistory, Users } from './index.js';
import { CreateWithUserOptions, SaveWithUserOptions } from '../types/hookparameter.js';

export interface TaskAttributes {
  id: number;
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

assignedUser?: Users;
updater?: Users;
assignedDepartment?: Departments;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'assigned_user_id' | 'description' | 'start_date' | 'finish_date' | 'created_at' | 'updated_at' | 'requester_mail' | 'requester_phone'> { }

class Tasks extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: number;
  public creator_id!: number;
  public authorized_user_id!: number;
  public assigned_dept_id!: number;
  public assigned_user_id?: number;

  public title!: string;
  public description?: string;
  public status!: TaskAttributes['status'];

  public start_date?: Date;
  public finish_date?: Date;
  public created_at?: Date;
  public updated_at?: Date;

  public requester_name!: string;
  public requester_mail?: string;
  public requester_phone?: number;
  public requester_rank!: TaskAttributes['requester_rank'];

  public assignedUser?: Users;
public updater?: Users;
public assignedDepartment?: Departments;
}

Tasks.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  creator_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  authorized_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assigned_dept_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assigned_user_id: {
    type: DataTypes.INTEGER,
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
  modelName: 'Tasks',
  tableName: 'tasks',
  hooks: {
    afterCreate: async (task, options: CreateWithUserOptions<TaskAttributes>) => {

      const { id, ...data } = task.toJSON();

      // 1. Create History
      await TasksHistory.create({ ...data, task_id: id });

      // 2. Create Activity Log
      const userId = options.userId ?? task.authorized_user_id;

      if (userId === undefined) {
        console.warn('userId is missing in Sequelize hook options. Skipping activity log.');
        return;
      }

      await ActivityLogs.create({
        user_id: userId || task.creator_id,
        action: 'create_task',
        targetType: 'task',
        targetId: id,
        metadata: data,
        createdAt: new Date(),
      });
    },

    afterUpdate: async (task, options: CreateWithUserOptions<TaskAttributes>) => {

      const { id, ...data } = task.toJSON();

      // 1. Create History
      await TasksHistory.create({ ...data, task_id: id });

      // 2. Create Activity Log
      const userId = options.userId ?? task.authorized_user_id;

      if (userId === undefined) {
        console.warn('userId is missing in Sequelize hook options. Skipping activity log.');
        return;
      }
      await ActivityLogs.create({
        user_id: userId || task.authorized_user_id, // assuming they updated the task
        action: 'update_task',
        targetType: 'task',
        targetId: id,
        metadata: data, // optionally include previous values too
        createdAt: new Date(),
      });
    },

    afterDestroy: async (task, options: CreateWithUserOptions<TaskAttributes>) => {

      // 1. Create Activity Log
      const userId = options.userId ?? task.authorized_user_id;

      if (userId === undefined) {
        console.warn('userId is missing in Sequelize hook options. Skipping activity log.');
        return;
      }

      await ActivityLogs.create({
        user_id: userId || task.authorized_user_id,
        action: 'delete_task',
        targetType: 'task',
        targetId: task.id,
        metadata: task.toJSON(),
        createdAt: new Date(),
      });
    },
  },
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default Tasks;
