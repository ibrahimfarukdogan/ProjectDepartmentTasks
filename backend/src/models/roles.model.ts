import { BelongsToManyAddAssociationMixin, BelongsToManyGetAssociationsMixin, BelongsToManyRemoveAssociationMixin, DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import Permissions from './permissions.model.js';
import ActivityLogs from './activityLogs.model.js';
import { CreateWithUserOptions, DestroyWithUserOptions, SaveWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';

export interface RoleAttributes {
  id: number;
  role_name: string;
}

interface RoleCreationAttributes extends Optional<RoleAttributes, 'id'> { }

class Roles extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public role_name!: string;

  public permissions?: Permissions[];

  public addPermission!: BelongsToManyAddAssociationMixin<Permissions, number>;
  public getPermissions!: BelongsToManyGetAssociationsMixin<Permissions>;
  public removePermission!: BelongsToManyRemoveAssociationMixin<Permissions, number>;
}

Roles.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'roles',
    modelName: 'Roles',

    hooks: {
      // 🔹 After Create
      afterCreate: async (role, options: CreateWithUserOptions<RoleAttributes>) => {
        const userId = options.userId;
        if (userId === undefined) {
          console.warn('userId missing in afterCreate hook (Roles)');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'create_role',
          targetType: 'role',
          targetId: role.id,
          metadata: {
            role_name: role.role_name,
          },
        });
      },

      // 🔹 After Update
      afterUpdate: async (role, options: UpdateWithUserOptions<RoleAttributes>) => {
        const userId = options.userId;
        if (userId === undefined) {
          console.warn('userId missing in afterUpdate hook (Roles)');
          return;
        }

        // Fetch associated permissions
        const permissions = await role.getPermissions({
          joinTableAttributes: [],
          attributes: ['id', 'category', 'level', 'description'],
        });

        await ActivityLogs.create({
          user_id: userId,
          action: 'update_role',
          targetType: 'role',
          targetId: role.id,
          metadata: {
            role_name: role.role_name,
            permissions: permissions.map((p) => ({
              id: p.id,
              category: p.category,
              level: p.level,
              description: p.description,
            })),
          },
        });
      },

      // 🔹 After Destroy
      afterDestroy: async (role, options: DestroyWithUserOptions<RoleAttributes>) => {
        const userId = options.userId;
        if (userId === undefined) {
          console.warn('userId missing in afterDestroy hook (Roles)');
          return;
        }

        await ActivityLogs.create({
          user_id: userId,
          action: 'destroy_role',
          targetType: 'role',
          targetId: role.id,
          metadata: {
            role_name: role.role_name,
          },
        });
      }
    },
    timestamps: false,
  }
);

export default Roles;
