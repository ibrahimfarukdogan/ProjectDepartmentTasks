import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import ActivityLogs from './activityLogs.model.js';
import { CreateWithUserOptions } from '../types/hookparameter.js';

export interface TaskCommentAttributes {
  id: number;
  task_id: number;
  commenter_user_id: number;
  comment: string;
  image_url?: string;
  created_at: Date;
}

interface TaskCommentCreationAttributes
  extends Optional<TaskCommentAttributes, 'id' | 'image_url' | 'created_at'> { }

class TaskComments extends Model<TaskCommentAttributes, TaskCommentCreationAttributes>
  implements TaskCommentAttributes {
  public id!: number;
  public task_id!: number;
  public commenter_user_id!: number;
  public comment!: string;
  public image_url?: string;
  public created_at!: Date;
}

TaskComments.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    commenter_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'TaskComments',
    tableName: 'task_comments',
    hooks: {
      afterCreate: async (comment, options: CreateWithUserOptions<TaskCommentAttributes>) => {
        const userId = options.userId;

        if (userId === undefined) {
          console.warn('userId is missing in Sequelize hook options. Skipping activity log.');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'create_task_comment',
          targetType: 'task_comment',
          targetId: comment.id,
          metadata: {
            task_id: comment.task_id,
            comment: comment.comment,
            image_url: comment.image_url,
          },
        });
      },

      afterUpdate: async (comment, options: CreateWithUserOptions<TaskCommentAttributes>) => {
        const userId = options.userId;

        if (userId === undefined) {
          console.warn('userId is missing in Sequelize hook options. Skipping activity log.');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'update_task_comment',
          targetType: 'task_comment',
          targetId: comment.id,
          metadata: {
            task_id: comment.task_id,
            comment: comment.comment,
            image_url: comment.image_url,
          },
        });
      },

      afterDestroy: async (comment, options: CreateWithUserOptions<TaskCommentAttributes>) => {
        const userId = options.userId;

        if (userId === undefined) {
          console.warn('userId is missing in Sequelize hook options. Skipping activity log.');
          return;
        }
        await ActivityLogs.create({
          user_id: userId,
          action: 'destroy_task_comment',
          targetType: 'task_comment',
          targetId: comment.id,
          metadata: {
            task_id: comment.task_id,
            comment: comment.comment,
            image_url: comment.image_url,
          },
        });
      },
    },
    timestamps: false,
  }
);

export default TaskComments;
