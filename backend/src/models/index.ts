import Users from './users.model.js';
import Departments from './departments.model.js';
import Roles from './roles.model.js';
import Tasks from './tasks.model.js';
import TasksHistory from './tasksHistory.model.js';
import TaskComments from './taskComments.model.js';
import Notifications from './notifications.model.js';
import ActivityLogs from './activityLogs.model.js';
import Permissions from './permissions.model.js';
import DepartmentMembers from './departmentMembers.model.js'; 
import RolePermissions from './rolePermissions.model.js';

// Initialize associations here
Users.belongsTo(Roles, { foreignKey: 'role_id', as: 'role' });
Users.hasMany(Tasks, { foreignKey: 'creator_id', as: 'creatorTasks', onDelete: 'SET NULL' });
Users.hasMany(Tasks, { foreignKey: 'assigned_user_id', as: 'assignedTasks', onDelete: 'SET NULL' });
Users.hasMany(Tasks, { foreignKey: 'authorized_user_id', as: 'updatedTasks', onDelete: 'SET NULL' });
Users.hasMany(TasksHistory, { foreignKey: 'creator_id', as: 'historyCreatorTasks', onDelete: 'SET NULL' });
Users.hasMany(TasksHistory, { foreignKey: 'assigned_user_id', as: 'historyAssignedTasks' });
Users.hasMany(TasksHistory, { foreignKey: 'authorized_user_id', as: 'historyUpdatedTasks' });
Users.hasMany(TaskComments, {foreignKey: 'commenter_user_id',as: 'taskComments',onDelete: 'SET NULL'});
Users.hasMany(Notifications, {foreignKey: 'user_id', as: 'notifications',onDelete: 'CASCADE',});
Users.hasMany(ActivityLogs, { foreignKey: 'user_id', as: 'activityLogs' });
Users.hasMany(Departments, { as: 'managedDepartments', foreignKey: 'manager_id' });

Roles.hasMany(Users, { foreignKey: 'role_id' });

Notifications.belongsTo(Users, {foreignKey: 'user_id', as: 'user',});

Departments.hasMany(Tasks, { foreignKey: 'assigned_dept_id', as: 'assigned_tasks' });
Departments.hasMany(TasksHistory, { foreignKey: 'assigned_dept_id', as: 'historyAssigned_tasks' });
Departments.belongsTo(Departments, {as: 'parent', foreignKey: 'parent_id'});
Departments.hasMany(Departments, { as: 'subdepartments',foreignKey: 'parent_id',});
Departments.belongsTo(Users, { as: 'manager', foreignKey: 'manager_id' });

Tasks.belongsTo(Users, { foreignKey: 'creator_id', as: 'creator', onDelete: 'SET NULL' });
Tasks.belongsTo(Users, { foreignKey: 'authorized_user_id', as: 'updater', onDelete: 'SET NULL' });
Tasks.belongsTo(Users, { foreignKey: 'assigned_user_id', as: 'assignedUser', onDelete: 'SET NULL' });
Tasks.belongsTo(Departments, {foreignKey: 'assigned_dept_id',as: 'assignedDepartment',onDelete: 'CASCADE'});
Tasks.hasMany(TaskComments, {foreignKey: 'task_id',as: 'comments',onDelete: 'CASCADE'});

TasksHistory.belongsTo(Users, { foreignKey: 'creator_id', as: 'historyCreator', onDelete: 'SET NULL' });
TasksHistory.belongsTo(Tasks, {foreignKey: 'task_id',as: 'originalTask',onDelete: 'CASCADE'});
TasksHistory.belongsTo(Users, {foreignKey: 'authorized_user_id',as: 'historyUpdater',onDelete: 'SET NULL'});
TasksHistory.belongsTo(Users, {foreignKey: 'assigned_user_id',as: 'historyAssignedUser',onDelete: 'SET NULL'});
TasksHistory.belongsTo(Departments, {foreignKey: 'assigned_dept_id',as: 'historyDepartment',onDelete: 'CASCADE'});

TaskComments.belongsTo(Users, {foreignKey: 'commenter_user_id',as: 'commenter',onDelete: 'SET NULL'});
TaskComments.belongsTo(Tasks, {foreignKey: 'task_id',as: 'task',onDelete: 'CASCADE'});

// Many-to-Many (if needed)
Users.belongsToMany(Departments, {
  through: DepartmentMembers,
  foreignKey: 'member_id',
  otherKey: 'department_id',
  as: 'member_departments',
  onDelete: 'CASCADE',
});

Departments.belongsToMany(Users, {
  through: DepartmentMembers,
  foreignKey: 'department_id',
  otherKey: 'member_id',
  as: 'members',
  onDelete: 'CASCADE',
});

Roles.belongsToMany(Permissions, {
  through: RolePermissions,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
  onDelete: 'CASCADE',
});

Permissions.belongsToMany(Roles, {
  through: RolePermissions,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
  onDelete: 'CASCADE',
});

// Export all models for usage
export {
  Users,
  Departments,
  Roles,
  Permissions,
  Tasks,
  TasksHistory,
  Notifications,
  ActivityLogs,
  TaskComments,
  DepartmentMembers,
  RolePermissions
};
