import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import ActivityLogs from './activityLogs.model.js';
import { CreateWithUserOptions } from '../types/hookparameter.js';

export interface DepartmentMemberAttributes {
  department_id: number;
  member_id: number;
}

interface DepartmentMemberCreationAttributes extends Optional<DepartmentMemberAttributes, never> {}

class DepartmentMembers extends Model<DepartmentMemberAttributes, DepartmentMemberCreationAttributes>
  implements DepartmentMemberAttributes {
  public department_id!: number;
  public member_id!: number;
}

DepartmentMembers.init({
  department_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  member_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'department_members',
  modelName: 'DepartmentMembers',
  timestamps: false,

  hooks: {
    afterCreate: async (instance, options: CreateWithUserOptions<DepartmentMemberAttributes>) => {
      const userId = options.userId;
      if (!userId) {
        console.warn('[department_members] Missing userId in hook options');
        return;
      }

      await ActivityLogs.create({
        user_id: userId,
        action: 'add_user_to_department',
        targetType: 'department_member',
        targetId: instance.department_id,
        metadata: {
          department_id: instance.department_id,
          member_id: instance.member_id,
        },
      });
    },
  },
});

export default DepartmentMembers;
