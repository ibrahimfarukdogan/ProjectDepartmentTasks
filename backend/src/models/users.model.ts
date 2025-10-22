import { BelongsToGetAssociationMixin, BelongsToManyGetAssociationsMixin, DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/db.js';
import bcrypt from 'bcrypt';
import { Departments, ActivityLogs, Roles } from './index.js';
import { CreateWithUserOptions, DestroyWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';

export interface UserAttributes {
  id: number;
  name?: string;
  mail: string;
  password: string;
  role_id?: number;

  adress?: string;
  phone?: string;

  push_token?: string;

  created_at?: Date;
  updated_at?: Date;

  role?: Roles;
}

// Define creation attributes (id and created_at optional when creating)
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at'> { }

class Users extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name?: string;
  public mail!: string;
  public password!: string;
  public role_id?: number;
  public adress?: string;
  public phone?: string;
  public created_at?: Date;
  public updated_at?: Date;

  public role?: Roles;

  public push_token?: string;

  public getRole!: BelongsToGetAssociationMixin<Roles>;
  public getMember_departments!: BelongsToManyGetAssociationsMixin<Departments>;
}

Users.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: DataTypes.STRING,
  mail: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  adress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^[\d+\-\s()]+$/i,  // Optional: allows digits, +, -, space, ()
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  push_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },

}, {
  sequelize,
  modelName: 'Users',
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const saltRounds = 10;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const saltRounds = 10;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    },

    // 🟢 Log after user creation
    afterCreate: async (user, options: CreateWithUserOptions<UserAttributes>) => {
      const userId = options.userId;
      if (userId === undefined) {
        console.warn('userId missing in afterCreate hook (Users)');
        return;
      }

      await ActivityLogs.create({
        user_id: userId,
        action: 'create_user',
        targetType: 'user',
        targetId: user.id,
        metadata: {
          mail: user.mail,
          name: user.name,
          role_id: user.role_id,
          adress: user.adress,
          phone: user.phone,
        },
      });
    },

    // 🟡 Log after user update
    afterUpdate: async (user, options: UpdateWithUserOptions<UserAttributes>) => {
      const userId = options.userId;
      if (userId === undefined) {
        console.warn('userId missing in afterUpdate hook (Users)');
        return;
      }

      await ActivityLogs.create({
        user_id: userId,
        action: 'update_user',
        targetType: 'user',
        targetId: user.id,
        metadata: {
          mail: user.mail,
          name: user.name,
          role_id: user.role_id,
          adress: user.adress,
          phone: user.phone,
        },
      });
    },

    // 🔴 Log after user deletion
    afterDestroy: async (user, options: DestroyWithUserOptions<UserAttributes>) => {
      const userId = options.userId;
      if (userId === undefined) {
        console.warn('userId missing in afterDestroy hook (Users)');
        return;
      }

      await ActivityLogs.create({
        user_id: userId,
        action: 'destroy_user',
        targetType: 'user',
        targetId: user.id,
        metadata: {
          mail: user.mail,
          name: user.name,
          role_id: user.role_id,
          adress: user.adress,
          phone: user.phone,
        },
      });
    },
  },

  timestamps: true,
  createdAt: 'created_at',
});


export default Users;