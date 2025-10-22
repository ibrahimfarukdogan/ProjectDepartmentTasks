import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToManyAddAssociationMixin, BelongsToManyCountAssociationsMixin, BelongsToManyGetAssociationsMixin, BelongsToManyHasAssociationMixin, BelongsToManyRemoveAssociationMixin, BelongsToSetAssociationMixin, DataTypes, HasManyAddAssociationMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import { ActivityLogs, Users } from './index.js';
import { CreateWithUserOptions, DestroyWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';

export interface DepartmentAttributes {
  id: number;
  dept_name: string;
  parent_id?: number | null;
  manager_id: number;

  created_at?: Date;
  updated_at?: Date;
}

interface DepartmentCreationAttributes extends Optional<DepartmentAttributes, 'id' | 'parent_id' | 'created_at' | 'updated_at'> { }

class Departments extends Model<DepartmentAttributes, DepartmentCreationAttributes>
  implements DepartmentAttributes {
  public id!: number;
  public dept_name!: string;
  public parent_id?: number | null;
  public manager_id!: number;

  public created_at?: Date;
  public updated_at?: Date;

  // ✅ Association mixins for TypeScript
  public addMember!: BelongsToManyAddAssociationMixin<Users, number>;
  public removeMember!: BelongsToManyRemoveAssociationMixin<Users, number>;
  public getMembers!: BelongsToManyGetAssociationsMixin<Users>;
  public countMembers!: BelongsToManyCountAssociationsMixin;
  public hasMember!: BelongsToManyHasAssociationMixin<Users, number>;

  public members?: Users[];

  // Parent association mixin (belongsTo)
  public getParent!: BelongsToGetAssociationMixin<Departments>;
  public setParent!: BelongsToSetAssociationMixin<Departments, number>;
  public createParent!: BelongsToCreateAssociationMixin<Departments>;

  public parent?: Departments;

  // Subdepartments association mixin (hasMany)
  public getSubdepartments!: HasManyGetAssociationsMixin<Departments>;
  public addSubdepartment!: HasManyAddAssociationMixin<Departments, number>;
  public hasSubdepartment!: HasManyHasAssociationMixin<Departments, number>;
  public countSubdepartments!: HasManyCountAssociationsMixin;
  public createSubdepartment!: HasManyCreateAssociationMixin<Departments>;

  public subdepartments?: Departments[];

}

Departments.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  dept_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Departments,
      key: 'id',
    },
    onDelete: 'SET NULL', //Prevent Deletion
  },
    manager_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Users,
      key: 'id',
    },
    onDelete: 'RESTRICT',
  },

  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Departments',
  tableName: 'departments',

  hooks: {
    // 🟢 After Create
    afterCreate: async (department, options: CreateWithUserOptions<DepartmentAttributes>) => {
      const userId = options.userId;
      if (userId === undefined) {
        console.warn('userId missing in afterCreate hook (Departments)');
        return;
      }

      await ActivityLogs.create({
        user_id: userId,
        action: 'create_department',
        targetType: 'department',
        targetId: department.id,
        metadata: {
          dept_name: department.dept_name,
          parent_id: department.parent_id,
        },
      });
    },

    // 🟡 After Update
    afterUpdate: async (department, options: UpdateWithUserOptions<DepartmentAttributes>) => {
      const userId = options.userId;
      if (userId === undefined) {
        console.warn('userId missing in afterUpdate hook (Departments)');
        return;
      }

      await ActivityLogs.create({
        user_id: userId,
        action: 'update_department',
        targetType: 'department',
        targetId: department.id,
        metadata: {
          dept_name: department.dept_name,
          parent_id: department.parent_id,
          updated_at: department.updated_at,
        },
      });
    },

    // 🔴 After Destroy
    afterDestroy: async (department, options: DestroyWithUserOptions<DepartmentAttributes>) => {
      const userId = options.userId;
      if (userId === undefined) {
        console.warn('userId missing in afterDestroy hook (Departments)');
        return;
      }

      await ActivityLogs.create({
        user_id: userId,
        action: 'destroy_department',
        targetType: 'department',
        targetId: department.id,
        metadata: {
          dept_name: department.dept_name,
          parent_id: department.parent_id,
        },
      });
    }
  },
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default Departments;
