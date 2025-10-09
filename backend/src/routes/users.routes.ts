import express, { Request, Response, NextFunction } from 'express';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import requirePermission from '../middlewares/requirePermission.middleware.js';
import { Users, Departments, Roles, Tasks } from '../models/index.js';
import { CheckOwnAndSubDeparmentAllowance, } from '../utils/utils.js';
import { CreateWithUserOptions, DestroyWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';
import { UserAttributes } from '../models/users.model.js';
import { RoleAttributes } from '../models/roles.model.js';
import { PermissionAttributes } from '../models/permissions.model.js';
import { Permissions } from '../models/index.js';
import { RolePermissionAttributes } from '../models/rolePermissions.model.js';
import { TaskStats } from '../types/stats.js';
import { Sequelize } from 'sequelize';

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
      // Build allowed dept list
      const userDepartments = await currentUser.getMember_departments();

      const isAuthorized = CheckOwnAndSubDeparmentAllowance(deptIdParam, userDepartments);

      if (!isAuthorized) {
        res.status(403).json({ message: 'Forbidden: you cannot create user in this department' });
        return;
      }
      // Optional: check the department actually exists
      const department = await Departments.findByPk(deptIdParam);
      if (!department) {
        res.status(404).json({ message: 'Department not found' });
        return;
      }

      // ✅ Set default role_id to 1 if not provided
      if (!data.role_id) {
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

      if (!isInTargetDept) {
        res.status(403).json({ error: 'User is not a member of the specified department.' });
        return;
      }

      // 🔒 Step 2: Check if current user is allowed to manage the target department
      const currentUserDepartments = await currentUser.getMember_departments();
      const isAuthorized = await CheckOwnAndSubDeparmentAllowance(targetDeptId, currentUserDepartments);

      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not authorized to manage users in this department.' });
        return;
      }

      // 📝 Step 3: Only allow updates to safe fields
      const { name, role_id, adress, phone, mail } = req.body;

      if (name !== undefined) targetUser.name = name;
      if (role_id !== undefined) targetUser.role_id = role_id;
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

// 2. Delete user (if user is in allowed department)
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
      const isAuthorized = CheckOwnAndSubDeparmentAllowance(department.id, userDepartments);

      if (!isAuthorized) {
        res.status(403).json({ message: 'Forbidden: you cannot delete this user' });
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


export default router;
