// models/rolePermissions.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import ActivityLogs from './activityLogs.model.js';
import { CreateWithUserOptions, DestroyWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';

export interface RolePermissionAttributes {
  id: number;
  roleId: number;
  permissionId: number;
}

interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, never> {}

class RolePermissions extends Model<RolePermissionAttributes, RolePermissionCreationAttributes>
  implements RolePermissionAttributes {
  public id!: number;
  public roleId!: number;
  public permissionId!: number;
}

RolePermissions.init(
  {
    id: {
  type: DataTypes.INTEGER,
  primaryKey: true,
  autoIncrement: true,
},
    roleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    permissionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'RolePermissions',
    tableName: 'role_permission',
    timestamps: false,

    hooks: {
      afterCreate: async (instance, options: CreateWithUserOptions<RolePermissionAttributes>) => {
        const userId = options.userId;
        if (!userId) {
          console.warn('[RolePermissions] Missing userId in afterCreate');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'add_permission_to_role',
          targetType: 'role_permission',
          targetId: instance.roleId,
          metadata: {
            roleId: instance.roleId,
            permissionId: instance.permissionId,
          },
        });
      },

      afterUpdate: async (instance, options: UpdateWithUserOptions<RolePermissionAttributes>) => {
        const userId = options.userId;
        if (!userId) {
          console.warn('[RolePermissions] Missing userId in afterUpdate');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'update_permission_to_role',
          targetType: 'role_permission',
          targetId: instance.roleId,
          metadata: {
            roleId: instance.roleId,
            permissionId: instance.permissionId,
          },
        });
      },




      afterDestroy: async (instance, options: DestroyWithUserOptions<RolePermissionAttributes>) => {
        const userId = options.userId;
        if (!userId) {
          console.warn('[RolePermissions] Missing userId in afterDestroy');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'remove_permission_from_role',
          targetType: 'role_permission',
          targetId: instance.roleId,
          metadata: {
            roleId: instance.roleId,
            permissionId: instance.permissionId,
          },
        });
      },
    },
  }
);

export default RolePermissions;
