import express, { Request, Response, NextFunction } from 'express';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import requirePermission from '../middlewares/requirePermission.middleware.js';
import { Users, Departments, Roles, Tasks } from '../models/index.js';
import { CheckOwnAndSubDeparmentAllowance, getUserPermissions, hasPermission, } from '../utils/utils.js';
import { CreateWithUserOptions, DestroyWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';
import { UserAttributes } from '../models/users.model.js';
import { RoleAttributes } from '../models/roles.model.js';
import { PermissionAttributes } from '../models/permissions.model.js';
import { Permissions } from '../models/index.js';
import { RolePermissionAttributes } from '../models/rolePermissions.model.js';
import { TaskStats } from '../types/stats.js';
import { Op, Sequelize } from 'sequelize';

const router = express.Router();

const categories: PermissionAttributes['category'][] = [
  'Departments',
  'Users',
  'Roles',
  'Permissions',
  'Tasks',
  'Comments',
  'ActivityLogs',
];

// 1. Create user in department (if allowed)
router.post('/:id/users',
  authenticateJWT,
  requirePermission('Users', 4),
  async (req: Request, res: Response) => {
    const deptIdParam = parseInt(req.params.id, 10);
    const data = req.body;  // e.g. { name, mail, password, role_id, etc. }
    const currentUser = await Users.findByPk(req.user!.id);

    if (!currentUser) {
      res.status(401).json({ error: 'Invalid user' });
      return;
    }

    if (isNaN(deptIdParam)) {
      res.status(400).json({ message: 'Invalid department id' });
      return;
    }
    try {
      // Optional: check the department actually exists
      const department = await Departments.findByPk(deptIdParam);
      if (!department) {
        res.status(404).json({ message: 'Department not found' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();

      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);

      const isAuthorized = hasDeptLevel2
        ? await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments)
        : userDepartments.some(d => d.id === department.id);
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not authorized for this department.' })
        return;
      }


      // ✅ Set default role_id to 1 if not provided
      if (!data.role_id || data.role_id == null) {
        let defaultRole = await Roles.findByPk(1);

        if (!defaultRole) {
          const options1: CreateWithUserOptions<RoleAttributes> = { userId: currentUser.id };
          defaultRole = await Roles.create({ id: 1, role_name: 'Default User' }, options1);

          for (const category of categories) {
            let level0 = await Permissions.findOne({
              where: { category, level: 0 },
            });

            // 🟡 If no level 0 permission exists, create it
            if (!level0) {
              console.warn(`No level 0 permission found for category: ${category}. Creating fallback.`);
              const options2: CreateWithUserOptions<PermissionAttributes> = { userId: currentUser.id };
              level0 = await Permissions.create({ category, level: 0, description: 'Nothing' }, options2);
            }
            const options3: CreateWithUserOptions<RolePermissionAttributes> = { userId: currentUser.id };

            await defaultRole.addPermission(level0, options3);
          }
        }
        if (defaultRole)
          data.role_id = defaultRole.id;
      }
      else {
        const Role = await Roles.findByPk(data.role_id);
        if (!Role) {
          res.status(404).json({ message: 'Role not found' });
          return;
        }
      }

      // Create user
      const options: CreateWithUserOptions<UserAttributes> = { userId: currentUser.id };

      // attach dept_id
      const newUser = await Users.create(data);

      if (!newUser) {
        res.status(401).json({ error: 'error: user creation did not work' });
        return;
      }

      // Add to department-members relation if using many-to-many, or other logic
      // If you have a through association: e.g. department.addMember
      await department.addMember(newUser, options);

      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// 🔁 Update user within department context
router.put('/:deptId/users/:userId',
  authenticateJWT,
  requirePermission('Users', 3), // Adjust permission level as needed
  async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const targetDeptId = parseInt(req.params.deptId);

      if (isNaN(targetUserId) || isNaN(targetDeptId)) {
        res.status(400).json({ error: 'Invalid user or department ID.' });
        return;
      }

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid authenticated user.' });
        return;
      }

      const targetUser = await Users.findByPk(targetUserId);
      if (!targetUser) {
        res.status(404).json({ error: 'Target user not found.' });
        return;
      }

      // 🔍 Step 1: Check if target user is part of the target department
      const targetUserDepartments = await targetUser.getMember_departments();
      const isInTargetDept = targetUserDepartments.some(dept => dept.id === targetDeptId);
      const department = await Departments.findByPk(targetDeptId);
      if (!department) {
        res.status(404).json({ message: 'Department not found' });
        return;
      }

      if (!isInTargetDept) {
        res.status(403).json({ error: 'User is not a member of the specified department.' });
        return;
      }

      // 🔒 Step 2: Check if current user is allowed to manage the target department
      const userDepartments = await currentUser.getMember_departments();

      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);

      const isAuthorized = hasDeptLevel2
        ? await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments)
        : userDepartments.some(d => d.id === department.id);
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not authorized for this department.' })
        return;
      }

      // 📝 Step 3: Only allow updates to safe fields
      const { name, role_id, adress, phone, mail } = req.body;

      if (name !== undefined) targetUser.name = name;
      if (role_id !== undefined && role_id !== null) {
        // Check if target user is a department manager
        if (targetUser.id === currentUser.id) {
          res.status(403).json({ error: 'You cannot change your own role.' });
          return;
        }
        const isManager = await Departments.findOne({ where: { manager_id: targetUser.id } });

        // Fetch new role's permissions
        const newRole = await Roles.findByPk(role_id, {
          include: [{ model: Permissions, as: 'permissions' }],
        });

        if (!newRole) {
          res.status(400).json({ error: 'Invalid role_id. Role not found.' });
          return;
        }

        // If user is a manager, make sure new role still allows management
        if (isManager) {
          // If user is a manager in the main department, make sure their role can not be changed to the role other than 
          if (department.parent_id == null && newRole.id != 2) {
            res.status(403).json({
              error: 'Target user is the main department manager. Cannot change their role to other than chairman unless main department manager changed to someone else.',
            });
            return;
          }
          const newPermissions = newRole.permissions || [];
          const hasUserLevel3 = newPermissions.some(p => p.category === 'Users' && p.level >= 3);

          if (department.parent_id !== undefined && department.parent_id !== null && !hasUserLevel3) {
            res.status(403).json({
              error: 'Target user is a department manager. Cannot assign a role without sufficient permissions (Users >= 3).',
            });
            return;
          }
        }

        // Passed all checks
        targetUser.role_id = role_id;
      }
      if (adress !== undefined) targetUser.adress = adress;
      if (phone !== undefined) targetUser.phone = phone;
      if (mail !== undefined) targetUser.mail = mail;

      const options: UpdateWithUserOptions<UserAttributes> = { userId: req.user!.id };

      await targetUser.save(options);

      res.status(200).json({ message: 'User updated successfully.', user: targetUser });
    } catch (err) {
      console.error('Update User Error:', err);
      res.status(500).json({ error: 'Failed to update user.', details: err });
    }
  }
);

// Delete user (if user is in allowed department)
router.delete('/:id/users/:userId',
  authenticateJWT,
  requirePermission('Users', 4),
  async (req: Request, res: Response) => {
    const deptId = parseInt(req.params.id);
    const userIdToDelete = parseInt(req.params.userId, 10);
    const currentUser = await Users.findByPk(req.user!.id);

    if (!currentUser) {
      res.status(401).json({ error: 'Invalid user' });
      return;
    }

    if (isNaN(deptId) || isNaN(userIdToDelete)) {
      res.status(400).json({ message: 'Invalid department ID or user ID' });
      return;
    }

    if (userIdToDelete === currentUser.id) {
      res.status(403).json({ message: 'You cannot delete your own account' });
      return;
    }

    try {
      const department = await Departments.findByPk(deptId);
      const userToDelete = await Users.findByPk(userIdToDelete);

      if (!department || !userToDelete) {
        res.status(404).json({ error: 'Department or User not found' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();
      const userDeleteDepartments = await userToDelete.getMember_departments();

      const isUserInDept = userDeleteDepartments.some(d => d.id === department.id);
      if (!isUserInDept) {
        res.status(404).json({ error: 'Requested User not found in the requested Department' });
        return;
      }

      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);

      const isAuthorized = hasDeptLevel2
        ? await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments)
        : userDepartments.some(d => d.id === department.id);
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not authorized for this department.' })
        return;
      }

      // 🚫 Prevent deleting a user if they are a department manager
      const isManager = await Departments.findOne({ where: { manager_id: userIdToDelete } });
      if (isManager) {
        res.status(400).json({
          error: 'Cannot delete user. They are assigned in  a department manager. Reassign first.'
        });
        return;
      }

      const options: DestroyWithUserOptions<typeof Users> = { userId: currentUser.id };
      await userToDelete.destroy(options);

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

/**
 * GET /api/users/:userId/task-stats
 * Get task statistics for a specific user
 */
router.get('/:userId/task-stats',
  authenticateJWT,
  requirePermission('Tasks', 3),
  async (req: Request, res: Response) => {
    const targetUserId = parseInt(req.params.userId, 10);
    const currentUserId = req.user!.id;

    if (isNaN(targetUserId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    try {
      const targetUser = await Users.findByPk(targetUserId);
      if (!targetUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const permissionLevel = req.permissionLevel;
      if (permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }

      // 🔒 Level 1 can only view their own stats
      if (permissionLevel === 1 && targetUserId !== currentUserId) {
        res.status(403).json({ error: 'Not authorized to view this user\'s tasks' });
        return;
      }

      // 📊 Build query
      const rawStats = await Tasks.findOne({
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'open' THEN 1 END`)), 'open'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'inprogress' THEN 1 END`)), 'inprogress'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'done' THEN 1 END`)), 'done'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'approved' THEN 1 END`)), 'approved'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'cancelled' THEN 1 END`)), 'cancelled'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN finish_date < CURRENT_DATE THEN 1 END`)), 'late'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN start_date > CURRENT_DATE THEN 1 END`)), 'not_started'],
        ],
        where: { assigned_user_id: targetUserId },
        raw: true,
      });

      const taskStats = rawStats as TaskStats | null;

      const finalStats: TaskStats = {
        open: taskStats?.open ?? 0,
        inprogress: taskStats?.inprogress ?? 0,
        done: taskStats?.done ?? 0,
        approved: taskStats?.approved ?? 0,
        cancelled: taskStats?.cancelled ?? 0,
        late: taskStats?.late ?? 0,
        not_started: taskStats?.not_started ?? 0,
      };

      res.json({
        userId: targetUserId,
        stats: finalStats,
      });
    } catch (error) {
      console.error('Error fetching user task stats:', error);
      res.status(500).json({ error: 'Failed to fetch task stats' });
    }
  }
);

/**
 * GET /api/users/:id/allusers
 * Get users that is not on the department
 */
router.get('/:id/allusers',
  authenticateJWT,
  requirePermission('Departments', 4),
  async (req: Request, res: Response) => {
    try {
      const deptId = parseInt(req.params.id);
      if (isNaN(deptId)) {
        res.status(400).json({ error: 'Invalid department' });
        return;
      }

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const dept = await Departments.findByPk(deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      // Get users in department
      const departmentMembers = await dept.getMembers({ attributes: ['id'] });
      const memberIds = departmentMembers.map(user => user.id);

      // Get all users NOT in the department
      const nonMembers = await Users.findAll({
        where: {
          id: {
            [Op.notIn]: memberIds,
          },
        },
        include: [
          {
            model: Roles,
            as: 'role',
            attributes: ['role_name'],
          },
        ],
        attributes: ['id', 'name'], // You can add more if needed
      });

      // Format the response
      const formatted = nonMembers.map(user => ({
        id: user.id,
        name: user.name,
        role: user.role?.role_name || 'No Role',
      }));

      res.status(200).json({ users: formatted });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching users', error: err });
    }
  }
);

/**
 * GET /api/users/visible
 * Get users visible to the current user depending on permission level
 */
router.get('/visibleusers',
  authenticateJWT,
  requirePermission('Departments', 1),
  async (req: Request, res: Response) => {
    const currentUserId = req.user!.id;
    const permissionLevel = req.permissionLevel;

    try {
      // If permission level is 4 or higher, return all users
      if (permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }
      if (permissionLevel >= 4) {
        const allUsers = await Users.findAll({
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['role_name'],
            },
          ],
          attributes: ['id', 'name', 'mail', 'role_id'],
        });

        res.status(200).json({ users: allUsers });
        return;
      }

      // Else, get departments where the user is the manager
      const managedDepartments = await Departments.findAll({
        where: { manager_id: currentUserId },
      });

      if (managedDepartments.length === 0) {
        res.status(200).json({ users: [] }); // No managed departments
        return;
      }

      // Get all member users in those departments
      const allMemberPromises = managedDepartments.map((dept) => dept.getMembers());
      const allMembersNested = await Promise.all(allMemberPromises);

      // Flatten and deduplicate users
      const memberMap: Record<number, Users> = {};
      for (const userList of allMembersNested) {
        for (const user of userList) {
          memberMap[user.id] = user;
        }
      }

      const visibleUsers = Object.values(memberMap);

      // Optionally include roles
      const usersWithRoles = await Promise.all(
        visibleUsers.map(async (user) => {
          const role = await user.getRole(); // Assuming this association exists
          return {
            id: user.id,
            name: user.name,
            mail: user.mail,
            role: role?.role_name || 'No Role',
          };
        })
      );

      res.status(200).json({ users: usersWithRoles });
    } catch (err) {
      console.error('Error fetching visible users:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


export default router;
