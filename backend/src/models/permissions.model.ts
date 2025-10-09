import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import ActivityLogs from './activityLogs.model.js';
import { CreateWithUserOptions, DestroyWithUserOptions, SaveWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';
import {RolePermissions} from './index.js';

export interface PermissionAttributes {
  id: number;
  category: 'Departments' | 'Users' | 'Roles' | 'Permissions' | 'Tasks' | 'Comments' | 'ActivityLogs';
  level: number;
  description: string;
}

interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'id'> { }

class Permissions extends Model<PermissionAttributes, PermissionCreationAttributes>
  implements PermissionAttributes {
  public id!: number;
  public category!: PermissionAttributes['category'];
  public level!: number;
  public description!: string;

RolePermissions?: RolePermissions;
}

Permissions.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    category: {
      type: DataTypes.ENUM('Departments', 'Users', 'Roles', 'Permissions', 'Tasks', 'Comments', 'ActivityLogs'),
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'permissions',
    modelName: 'Permissions',
    hooks: {
      // CREATE hook
      afterCreate: async (permission, options: CreateWithUserOptions<PermissionAttributes>) => {
        const userId = options.userId;
        if (userId === undefined) {
          console.warn('userId missing in afterCreate hook (Permissions)');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'create_permission',
          targetType: 'permission',
          targetId: permission.id,
          metadata: {
            category: permission.category,
            level: permission.level,
            description: permission.description,
          },
        });
      },

      // UPDATE hook
      afterUpdate: async (permission, options: UpdateWithUserOptions<PermissionAttributes>) => {
        const userId = options.userId;
        if (userId === undefined) {
          console.warn('userId missing in afterUpdate hook (Permissions)');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'update_permission',
          targetType: 'permission',
          targetId: permission.id,
          metadata: {
            category: permission.category,
            level: permission.level,
            description: permission.description,
          },
        });
      },

      // DESTROY hook
      afterDestroy: async (permission, options: DestroyWithUserOptions<PermissionAttributes>) => {
        const userId = options.userId;
        if (userId === undefined) {
          console.warn('userId missing in afterDestroy hook (Permissions)');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'destroy_permission',
          targetType: 'permission',
          targetId: permission.id,
          metadata: {
            category: permission.category,
            level: permission.level,
            description: permission.description,
          },
        });
      }
    },
    timestamps: false,
  }
);

export default Permissions;
