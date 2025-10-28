import { Departments, Notifications, Roles, Users, Permissions, RolePermissions } from "../models/index.js";
import { PermissionAttributes } from "../models/permissions.model.js";
import { TaskAttributes } from "../models/tasks.model.js";

export async function getOwnAndSubDepartments(parentId: number): Promise<number[]> {
  const all = await Departments.findAll();
  const map = new Map<number, number[]>();

  for (const dept of all) {
    const parentId = dept.parent_id ?? -1; // fallback if null/undefined

    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push(dept.id);
  }

  const result: number[] = [];

  function recurse(id: number) {
    const children = map.get(id) || [];
    for (const child of children) {
      result.push(child);
      recurse(child);
    }
  }

  recurse(parentId);
  return [parentId, ...result];
}
export async function CheckOwnAndSubDeparmentAllowance(deptId: number, userDepartments: Departments[]) {
  let isAuthorized = false;
  isAuthorized = userDepartments.some(d => d.id === deptId);
  if (!isAuthorized) {
    for (const dept of userDepartments) {
      const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);

      if (allowedSubDeptIds.includes(deptId)) {
        isAuthorized = true;
        break;
      }
    }
  }

  return isAuthorized;

}
export async function sendTaskStatusNotification(task: TaskAttributes, newStatus: 'open' | 'inprogress' | 'done' | 'approved' | 'cancelled', currentUserId: number) {
  if (task.status === newStatus) return;

  const notifications = [];

  const department = await Departments.findByPk(task.assigned_dept_id);
  const departmentName = department?.dept_name ?? 'your';

  if (newStatus === 'done' && task.assigned_user_id === currentUserId) {
    notifications.push({
      user_id: task.authorized_user_id,
      title: '⚠️ Görev durumu',
      message: ` "${departmentName}" departmanınızdaki atadığınız göreviniz "${task.title}" durumu "${newStatus}" şeklinde işaretlendi.`,
      type: 'task',
      metadata: { taskId: task.id },
      url: `/departments/${task.assigned_dept_id}/tasks/${task.id}`
    });
  }

  if (
    ['approved', 'cancelled'].includes(newStatus) &&
    task.authorized_user_id === currentUserId
  ) {
    notifications.push({
      user_id: task.creator_id,
      title: '⚠️ Görev durumu',
      message: ` "${departmentName}" departmanınızdaki oluşturduğunuz göreviniz "${task.title}" durumu "${newStatus}" şeklinde işaretlendi.`,
      type: 'task',
      metadata: { taskId: task.id },
      url: `/departments/${task.assigned_dept_id}/tasks/${task.id}`
    });
  }

  for (const notification of notifications) {
    await Notifications.create(notification);
  }
}
export async function validateUserBelongsToDepartment(userId: number, deptId: number): Promise<boolean> {
  const user = await Users.findByPk(userId);
  if (!user) return false;
  const departments = await user.getMember_departments();
  return departments.some(dept => dept.id === deptId);
}
export async function sendTaskAssignmentNotifications(task: TaskAttributes) {
  const notifications = [];
  const department = await Departments.findByPk(task.assigned_dept_id, {
  include: [{
    model: Users,
    as: 'members',
    include: [{
      model: Roles,
      as: 'role', // ✅ must match the alias in your association
      include: [{
        model: Permissions, as:"permissions",
        where: { category: 'Tasks' },
      }],
    }],
  }],
});
  const departmentName = department?.dept_name ?? 'your';

  if (!department) return;
  // 🧍 If task assigned to a user → Notify them
  if (task.assigned_user_id) {
    notifications.push({
      user_id: task.assigned_user_id,
      title: '⚠️ Görev Atandı',
      message: `"${departmentName}" departmanınızda ismi "${task.title}" olan yeni bir görev size atandı.`,
      type: 'task',
      metadata: { taskId: task.id },
      url: `/departments/${task.assigned_dept_id}/tasks/${task.id}`
    });
  } else {
    // 🏢 If no user assigned → Notify all qualified users in the department
    const members = (department as Departments).members ?? [];
    for (const member of members) {
      const role = member.role;
      if (!role || !role.permissions) continue;

      const taskPermission = role.permissions.find(p => p.category === 'Tasks');
      if (taskPermission && taskPermission.level >= 3) {
        notifications.push({
          user_id: member.id,
          title: '⚠️ Görev Atandı',
          message: `"${departmentName}" departmanınıza ismi "${task.title}" olan yeni bir görev kullanıcız olarak atandı.`,
          type: 'task',
          metadata: { taskId: task.id },
          url: `/departments/${task.assigned_dept_id}/tasks/${task.id}`
        });
      }
    }
  }

  // 💌 Send all
  for (const notification of notifications) {
    await Notifications.create(notification);
  }
}

export async function getUserPermissions(user: Users): Promise<PermissionAttributes[]> {
  const role = await user.getRole();
  if (!role) return [];

  const permissions = await role.getPermissions(); // ✅ direct call
  return permissions;
}
export function hasPermission(userPermissions: PermissionAttributes[], category: string, level: number) {
  return userPermissions.some(p => p.category === category && p.level >= level);
}