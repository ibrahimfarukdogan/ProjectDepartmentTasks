import express, { Request, Response } from 'express';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import requirePermission from '../middlewares/requirePermission.middleware.js';
import { Users, Departments, Roles, Tasks, DepartmentMembers, RolePermissions } from '../models/index.js';
import { CheckOwnAndSubDeparmentAllowance, getOwnAndSubDepartments, getUserPermissions, hasPermission } from '../utils/utils.js';
import { CreateWithUserOptions, DestroyWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';
import { DepartmentAttributes } from '../models/departments.model.js';
import { DepartmentMemberAttributes } from '../models/departmentMembers.model.js';
import { Sequelize, Op } from 'sequelize';
import { DetailedDepartmentStatsResponse, DetailedDepartmentTaskStats, DetailedDepartmentTaskUsers, emptyTaskStats, emptyUserStats, TaskStats } from '../types/stats.js';

const router = express.Router();

/**
 * GET /api/departments
 * List all accessible departments a user can have
 */
router.get('/',
  authenticateJWT,
  requirePermission('Departments', 1),
  async (req: Request, res: Response) => {
    try {
      const currentUser = await Users.findByPk(req.user!.id);

      if (req.permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }

      if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();

      let ownDepartments = userDepartments;
      let subDepartmentIds: number[] = [];

      if (req.permissionLevel >= 2) {
        for (const dept of userDepartments) {
          const allSubIds = await getOwnAndSubDepartments(dept.id);

          // Remove the first value (own department's id)
          const [, ...subs] = allSubIds;
          subDepartmentIds.push(...subs);
        }
      }

      // Remove duplicates just in case
      subDepartmentIds = [...new Set(subDepartmentIds)];

      const ownDepartmentIds = ownDepartments.map(dept => dept.id);

      let subDepartments: Departments[] = [];
      if (subDepartmentIds.length) {
        subDepartments = await Departments.findAll({
          where: {
            id: subDepartmentIds.filter(id => !ownDepartmentIds.includes(id)),
          },
        });
      }

      res.json({
        ownDepartments,
        subDepartments
      });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching departments', error: err });
    }
  }
);

/**
 * GET /api/departments/:deptId
 * Get a single department if the user is authorized to view it
 */
router.get('/:deptId',
  authenticateJWT,
  requirePermission('Departments', 1),
  async (req: Request, res: Response) => {
    try {
      const deptId = parseInt(req.params.deptId);

      if (isNaN(deptId)) {
        res.status(400).json({ error: 'Invalid department ID' });
        return;
      }

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const permissionLevel = req.permissionLevel;
      if (permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();

      let isAuthorized = false;

      if (permissionLevel === 1) {
        isAuthorized = userDepartments.some(d => d.id === deptId);
      } else {
        isAuthorized = await CheckOwnAndSubDeparmentAllowance(deptId, userDepartments);
      }

      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to view this department' });
        return;
      }

      // Fetch the department with members and their roles, plus parent department
      const department = await Departments.findByPk(deptId, {
        include: [
          {
            model: Users,
            as: 'members',
            attributes: ['id', 'name', 'mail', 'adress', 'phone', 'created_at', 'updated_at'],
            include: [
              {
                model: Roles,
                as: 'role',
                attributes: ['role_name']
              }
            ]
          },
          {
            model: Departments,
            as: 'parent',
            attributes: ['id', 'dept_name']
          }
        ]
      });

      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const subdepartments = await department.getSubdepartments();
      let subDepartmentCount = 0;
      if (permissionLevel === 4)
        subDepartmentCount = subdepartments.length;

      // Send full department info if the permission is 4
      res.json({
        department: department,
        subDepartmentCount
      });

    } catch (err) {
      console.error("Department fetch error:", err instanceof Error ? err.message : err);
      res.status(500).json({ message: 'Error fetching department', error: err });
    }
  }
);

/**
 * GET /api/departments/:id/users
 * Get users of a department (if allowed)
 */
router.get('/:id/users',
  authenticateJWT,
  requirePermission('Users', 1),
  async (req: Request, res: Response) => {
    try {
      const deptId = parseInt(req.params.id);
      if (isNaN(deptId)) {
        res.status(400).json({ error: 'Invalid department' });
        return;
      }
      const currentUser = await Users.findByPk(req.user!.id);
      if (req.permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }
      const permissionLevel = req.permissionLevel; // From middleware

      let isAuthorized = false;
      const userDepartments = await currentUser.getMember_departments();

      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);

      if (hasDeptLevel2) {
        isAuthorized = await CheckOwnAndSubDeparmentAllowance(deptId, userDepartments);
      } else {
        isAuthorized = userDepartments.some(d => d.id === deptId);
      }

      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to view this department' });
        return;
      }
      const dept = await Departments.findByPk(deptId);
      if (!dept) {
        res.status(404).json({ error: 'can not find department' });
        return;
      }

      // Add user to department (via belongsToMany)
      const rawUsers = await dept.getMembers({
        include: [
          {
            model: Roles,
            as: 'role',
            attributes: ['id', 'role_name'] // only include necessary fields
          }
        ]
      });

      const users = rawUsers.map(user => {
        const userJson = user.toJSON(); // converts Sequelize model to plain JS object
        if (permissionLevel === 1) {
          return {
            id: userJson.id,
            name: userJson.name,
            mail: userJson.mail,
            role_id: userJson.role?.id ?? null,
            role: userJson.role?.role_name ?? null,
            adress: null,
            phone: null,
            created_at: null,
            updated_at: null,
          };
        } else {
          return {
            id: userJson.id,
            name: userJson.name,
            mail: userJson.mail,
            role_id: userJson.role?.id ?? null,
            role: userJson.role?.role_name ?? null,
            adress: userJson.adress,
            phone: userJson.phone,
            created_at: userJson.created_at?.toISOString() ?? null,
            updated_at: userJson.updated_at?.toISOString() ?? null,
          };
        }
      });

      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching users', error: err });
    }
  }
);

/**
 * POST /api/departments
 * Create a department (Level 3 required)
 */
router.post('/',
  authenticateJWT,
  requirePermission('Departments', 4), // Still required by default
  async (req: Request, res: Response) => {
    const { dept_name, parent_id, manager_id } = req.body;

    try {
      // Basic param validation
      if (!manager_id || isNaN(manager_id) || manager_id <= 0) {
        res.status(400).json({ error: 'manager_id is required and must be a positive number' });
        return;
      }

      const currentUser = await Users.findByPk(req.user!.id, {
        include: [{ model: Roles, as: 'role' }]
      });
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      // ✅ 1. Check if manager_id is a valid user
      const managerUser = await Users.findByPk(manager_id);
      if (!managerUser) {
        res.status(400).json({ error: 'Provided manager_id does not exist' });
        return;
      }

      // ✅ 2. Check permission levels
      const userPermissions = await getUserPermissions(managerUser);

      const hasUserLevel3 = hasPermission(userPermissions, 'Users', 3);
      const managerUserRole = await managerUser.getRole();

      if (parent_id === null || parent_id === undefined) {
        if (managerUserRole.id != 2) {
          res.status(403).json({ error: 'For top-level department, manager need to be the chairman role' });
          return;
        }
        res.status(400).json({ error: 'parent_id can not be null' });
        return;
      }
      else {
        if (!hasUserLevel3) {
          res.status(403).json({ error: 'For a sub-department, manager need to have Users:3 or higher permission' });
          return;
        }

        if (isNaN(parent_id) || parent_id <= 0) {
          res.status(400).json({ error: 'parent_id must be a positive number or null' });
          return;
        }

        // ✅ 3. Check authorization to assign that parent_id
        const userDepartments = await currentUser.getMember_departments();
        const isAuthorized = await CheckOwnAndSubDeparmentAllowance(parent_id, userDepartments);
        if (!isAuthorized) {
          res.status(403).json({ error: 'Not authorized to assign this parent_id' });
          return;
        }

      }

      const option: CreateWithUserOptions<DepartmentAttributes> = { userId: req.user!.id };
      const newDept = await Departments.create({ dept_name, parent_id, manager_id }, option);
      await newDept.addMember(managerUser);
      res.status(201).json(newDept);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error creating department', error: err });
    }
  }
);

/**
 * PUT /api/departments/:id
 * Update a department (Level 3 required)
 */
router.put('/:id',
  authenticateJWT,
  requirePermission('Departments', 4),
  async (req: Request, res: Response) => {
    const deptId = parseInt(req.params.id);
    const { dept_name, parent_id, manager_id } = req.body;

    try {
      const currentUser = await Users.findByPk(req.user!.id, {
        include: [{ model: Roles, as: 'role' }]
      });
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const dept = await Departments.findByPk(deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      // ✅ Ensure user has access to edit this department
      const userDepartments = await currentUser.getMember_departments();
      const isAuthorized = await CheckOwnAndSubDeparmentAllowance(deptId, userDepartments);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to update this department' });
        return;
      }

      // ✅ 1. Validate manager_id if provided
      if (manager_id) {
        const managerUser = await Users.findByPk(manager_id);
        if (!managerUser) {
          res.status(400).json({ error: 'Provided manager_id does not exist' });
          return;
        }
        const deptMembers = await dept.getMembers(); // Uses the alias
        const isMember = deptMembers.some(member => member.id === managerUser.id);
        if (!isMember) {
          res.status(400).json({ error: 'Assigned manager must be a member of the department' });
          return;
        }
        const managerUserRole = await managerUser.getRole();
        const userPermissions = await getUserPermissions(managerUser);
        const hasUserLevel3 = hasPermission(userPermissions, 'Users', 3);
        if (dept.parent_id === null && managerUserRole.id != 2) {
          res.status(403).json({ error: 'For top-level department, manager need to be the chairman role' });
          return;
        } else if (parent_id !== undefined && parent_id !== null && !hasUserLevel3) {
          res.status(403).json({ error: 'For a sub-department, manager need to have Users:3 or higher permission' });
          return;
        }
      }

      // ✅ 2. Validate parent_id logic

      if (dept.parent_id != null && parent_id == null) {
        res.status(400).json({ error: 'A sub department cannot be changed to a main department' });
        return;
      }
      if (parent_id !== undefined && parent_id !== null) {
        if (parent_id === deptId) {
          res.status(400).json({ error: 'A department cannot be its own parent' });
          return;
        }
        let parentValid = false;
        for (const dept of userDepartments) {
          const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);
          if (allowedSubDeptIds.includes(parent_id)) {
            parentValid = true;
            break;
          }
        }

        if (!parentValid) {
          res.status(403).json({ error: 'Not authorized to assign this parent_id' });
          return;
        }
      }

      // ✅ All checks passed, proceed with update
      const option: UpdateWithUserOptions<DepartmentAttributes> = { userId: req.user!.id };
      await dept.update({ dept_name, parent_id, manager_id }, option);

      res.json(dept);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error updating department', error: err });
    }
  }
);

/**
 * DELETE /api/departments/:id
 * Delete a department (Level 3 required)
 */
router.delete('/:id',
  authenticateJWT,
  requirePermission('Departments', 4),
  async (req: Request, res: Response) => {
    const deptId = parseInt(req.params.id);

    try {
      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();
      const isAuthorized = await CheckOwnAndSubDeparmentAllowance(deptId, userDepartments);
      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to delete this department' });
        return;
      }


      const dept = await Departments.findByPk(deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const subdepartments = await dept.getSubdepartments();
      if (subdepartments.length > 0) {
        res.status(400).json({
          error: 'Department has subdepartments. Please remove or reassign them before deleting this department.',
          subDepartmentCount: subdepartments.length,
        });
        return;
      }

      const option: DestroyWithUserOptions<DepartmentAttributes> = { userId: req.user!.id };
      await dept.destroy(option);
      res.json({ message: 'Department deleted' });

    } catch (err) {
      res.status(500).json({ message: 'Error deleting department', error: err });
    }
  }
);

/**
 * POST /api/departments/:id/users/add
 * Add user to department (via belongsToMany) (if allowed)
 */
router.post('/:id/users/add',
  authenticateJWT,
  requirePermission('Departments', 3),
  async (req: Request, res: Response) => {
    const deptId = parseInt(req.params.id);
    const { userId } = req.body;

    try {
      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }
      const department = await Departments.findByPk(deptId);
      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();
      const isAuthorized = await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments);
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not allowed to add users to this department.' });
        return;
      }

      const user = await Users.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isMember = await department.hasMember(user);
      if (isMember) {
        res.status(200).json({ message: 'User already in department' });
        return;
      }
      const option: CreateWithUserOptions<DepartmentMemberAttributes> = { userId: req.user!.id };

      // Add user to department (via belongsToMany)
      await department.addMember(user, option); // uses the alias "members"

      res.status(201).json({ message: 'User added to department' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error adding user to department', error: err });
    }
  }
);

/**
 * DELETE /api/departments/:id/users/:userId/remove
 * Remove user from a department (via belongsToMany) (if allowed)
 */
router.delete('/:id/users/:userId/remove',
  authenticateJWT,
  requirePermission('Departments', 3),
  async (req: Request, res: Response) => {
    const deptId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    try {
      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }
      const department = await Departments.findByPk(deptId, {
        include: [{
          association: 'members',
          attributes: ['id']
        }]
      });

      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }


      const userDepartments = await currentUser.getMember_departments();
      const isAuthorized = await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments);
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not allowed to remove user from this department.' });
        return;
      }

      const user = await Users.findByPk(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // 🚫 Prevent removing the manager of the department
      if (department.manager_id === userId) {
        res.status(400).json({
          error: 'Cannot remove the manager of the department. Assign a new manager first.'
        });
        return;
      }

      // Check if department is top-level
      const isTopLevel = department.parent_id === null;

      // Check if this user is the only one in the department
      const currentMembers = department.members || [];
      const isOnlyUser = currentMembers.length === 1 && currentMembers[0].id === userId;

      if (isTopLevel && isOnlyUser) {
        res.status(400).json({
          error: 'Cannot remove the only user from a top-level department. Assign another user first.'
        });
        return;
      }

      // Remove user from department
      await department.removeMember(user);

      res.json({ message: 'User removed from department' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error removing user from department', error: err });
    }
  }
);

/**
 * GET /api/departments/:id/task-stats
 * View Mini Task Statistics (if allowed)
 */
router.get('/:id/task-stats',
  authenticateJWT,
  requirePermission('Tasks', 1), // Minimum level required
  async (req: Request, res: Response) => {
    const departmentId = parseInt(req.params.id, 10);

    if (isNaN(departmentId)) {
      res.status(400).json({ error: 'Invalid department ID' });
      return;
    }

    try {
      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }
      if (req.permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }

      const permissionLevel = req.permissionLevel;

      const department = await Departments.findByPk(departmentId);

      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();

      let isAuthorized = false;

      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);

      if (hasDeptLevel2) {
        isAuthorized = await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments);
      } else {
        isAuthorized = userDepartments.some(d => d.id === department.id);
      }
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not allowed to get task statistics from this department.' });
        return;
      }

      const userId = currentUser.id;

      // Build WHERE condition based on permission level
      const whereClause: any = {
        assigned_dept_id: departmentId,
      };

      // Level 1: can only see their own tasks
      if (permissionLevel === 1) {
        whereClause.assigned_user_id = userId;
      }

      // Note: permissionLevel === 2 logic can be customized here if needed

      // Build query
      const rawStats = await Tasks.findOne({
        attributes: [
          //[Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'open' THEN 1 END`)), 'open'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'inprogress' THEN 1 END`)), 'inprogress'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'done' THEN 1 END`)), 'done'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'approved' THEN 1 END`)), 'approved'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'cancelled' THEN 1 END`)), 'cancelled'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN assigned_user_id IS NULL THEN 1 END`)), 'not_assigned'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN finish_date < CURRENT_DATE THEN 1 END`)), 'late'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN start_date > CURRENT_DATE THEN 1 END`)), 'not_started'],
        ],
        where: whereClause,
        raw: true,
      });
      const taskStats = rawStats as TaskStats | null;

      if (!taskStats) {
        res.status(200).json({
          departmentId,
          stats: {
            //total: 0,
            open: 0,
            inprogress: 0,
            done: 0,
            approved: 0,
            cancelled: 0,
            late: 0,
            not_started: 0,
            ...(permissionLevel >= 3 && { not_assigned: 0 })
          }
        });
        return;
      }

      const finalStats: TaskStats = {
        //total: taskStats.total ?? 0,
        open: taskStats.open ?? 0,
        inprogress: taskStats.inprogress ?? 0,
        done: taskStats.done ?? 0,
        approved: taskStats.approved ?? 0,
        cancelled: taskStats.cancelled ?? 0,
        late: taskStats.late ?? 0,
        not_started: taskStats.not_started ?? 0,
        ...(permissionLevel >= 3 ? { not_assigned: taskStats.not_assigned ?? 0 } : {})
      };


      // Hide 'not_assigned' if user is not level 3
      if (permissionLevel < 3 && taskStats) {
        delete finalStats.not_assigned;
      }

      res.json({
        departmentId,
        stats: finalStats,
      });
    } catch (error) {
      console.error('Error fetching task stats:', error);
      res.status(500).json({ error: 'Failed to fetch task stats' });
    }
  }
);

/**
 * GET /api/departments/:id/detailed-stats
 * View Full Department Statistics (if allowed)
 */
router.get('/:id/detailed-stats',
  authenticateJWT,
  requirePermission('Departments', 3),
  async (req: Request, res: Response) => {
    const departmentId = parseInt(req.params.id, 10);
    if (isNaN(departmentId)) {
      res.status(400).json({ error: 'Invalid department ID' });
      return;
    }

    try {
      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }
      const department = await Departments.findByPk(departmentId);
      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const userId = currentUser.id;

      let isAuthorized = false;

      const userDepartments = await currentUser.getMember_departments();
      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);

      if (hasDeptLevel2) {
        isAuthorized = await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments);
      } else {
        isAuthorized = userDepartments.some(d => d.id === department.id);
      }
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not allowed to get department statistics from this department.' });
        return;
      }

      // ---------------------- TASK STATS ----------------------
      const taskStatsRaw = await Tasks.findOne({
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'open' THEN 1 END`)), 'open'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'inprogress' THEN 1 END`)), 'inprogress'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'done' THEN 1 END`)), 'done'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'approved' THEN 1 END`)), 'approved'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'cancelled' THEN 1 END`)), 'cancelled'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN assigned_user_id IS NULL THEN 1 END`)), 'not_assigned'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN finish_date < CURRENT_DATE THEN 1 END`)), 'late'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN start_date > CURRENT_DATE THEN 1 END`)), 'not_started'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN requester_rank = 'milletvekili' THEN 1 END`)), 'requester_milletvekili'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN requester_rank = 'kaymakamlik' THEN 1 END`)), 'requester_kaymakamlik'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN requester_rank = 'muhtarlik' THEN 1 END`)), 'requester_muhtarlik'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN requester_rank = 'diger' THEN 1 END`)), 'requester_diger'],
        ],
        where: { assigned_dept_id: departmentId },
        raw: true,
      });

      const tasksRawAssigned = taskStatsRaw as DetailedDepartmentTaskStats | null;

      if (!tasksRawAssigned) {
        res.status(200).json({
          departmentId,
          taskStats: {
            emptyTaskStats
          },
          userStats: {
            emptyUserStats
          }
        });
        return;
      }


      const [created, authorized, assigned] = await Promise.all([
        Tasks.count({ where: { assigned_dept_id: departmentId, creator_id: userId } }),
        Tasks.count({ where: { assigned_dept_id: departmentId, authorized_user_id: userId } }),
        Tasks.count({ where: { assigned_dept_id: departmentId, assigned_user_id: userId } }),
      ]);

      const taskStats: DetailedDepartmentTaskStats = {
        total: Number(tasksRawAssigned?.total ?? 0),
        open: Number(tasksRawAssigned?.open ?? 0),
        inprogress: Number(tasksRawAssigned?.inprogress ?? 0),
        done: Number(tasksRawAssigned?.done ?? 0),
        approved: Number(tasksRawAssigned?.approved ?? 0),
        cancelled: Number(tasksRawAssigned?.cancelled ?? 0),
        late: Number(tasksRawAssigned?.late ?? 0),
        not_started: Number(tasksRawAssigned?.not_started ?? 0),
        not_assigned: Number(tasksRawAssigned?.not_assigned ?? 0),
        requester_milletvekili: Number(tasksRawAssigned?.requester_milletvekili ?? 0),
        requester_kaymakamlik: Number(tasksRawAssigned?.requester_kaymakamlik ?? 0),
        requester_muhtarlik: Number(tasksRawAssigned?.requester_muhtarlik ?? 0),
        requester_diger: Number(tasksRawAssigned?.requester_diger ?? 0),
        created_by_me: created,
        authorized_by_me: authorized,
        assigned_to_me: assigned,
      };

      // ---------------------- USER STATS ----------------------
      const members = await department.getMembers({ attributes: ['id'], raw: true });
      const memberIds = members.map(m => m.id);;

      const usersWithTasks = await Tasks.count({
        where: {
          assigned_dept_id: departmentId,
          assigned_user_id: { [Op.in]: memberIds },
        },
        distinct: true,
        col: 'assigned_user_id',
      });

      const usersWithout = memberIds.length - usersWithTasks;

      const childDeptCount = await department.countSubdepartments();

      const userStats: DetailedDepartmentTaskUsers = {
        totalUsers: memberIds.length,
        usersWithTasks: usersWithTasks,
        usersWithoutTasks: usersWithout,
        numberOfChildDepartments: childDeptCount,
      };

      const response: DetailedDepartmentStatsResponse = {
        departmentId,
        taskStats,
        userStats,
      };

      res.json(response);
    } catch (error) {
      console.error('Failed to fetch detailed stats', error);
      res.status(500).json({ error: 'Failed to fetch detailed department statistics' });
    }
  }
);

/**
 * GET /api/departments/:id/tasks
 * Get tasks of a department (if allowed)
 */
router.get('/:id/tasks',
  authenticateJWT,
  requirePermission('Tasks', 1),
  async (req: Request, res: Response) => {
    try {
      const deptId = parseInt(req.params.id);
      if (isNaN(deptId)) {
        res.status(400).json({ error: 'Invalid department ID' });
        return;
      }

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const permissionLevel = req.permissionLevel;
      if (permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set' });
        return;
      }

      const department = await Departments.findByPk(deptId);
      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();
      const isMember = userDepartments.some(d => d.id === deptId);

      if (permissionLevel < 3 && !isMember) {
        res.status(403).json({ error: 'Not authorized to access this department' });
        return;
      }

      let isAuthorized = false;

      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);

      if (hasDeptLevel2) {
        isAuthorized = await CheckOwnAndSubDeparmentAllowance(department.id, userDepartments);
      } else {
        isAuthorized = userDepartments.some(d => d.id === department.id);
      }
      if (!isAuthorized) {
        res.status(403).json({ error: 'You are not allowed to get the tasks from this department.' });
        return;
      }

      let tasks: Tasks[] = [];

      if (permissionLevel >= 3) {
        // Admin or similar: full access to department's tasks
        tasks = await Tasks.findAll({
          where: { assigned_dept_id: deptId },
          include: includeRelations,
        });
      } else {
        // Limited access: only tasks where user is involved
        const [creatorTasks, assignedTasks, authorizedTasks] = await Promise.all([
          Tasks.findAll({
            where: {
              creator_id: currentUser.id,
              assigned_dept_id: deptId,
            },
            include: includeRelations,
          }),
          Tasks.findAll({
            where: {
              assigned_user_id: currentUser.id,
              assigned_dept_id: deptId,
            },
            include: includeRelations,
          }),
          Tasks.findAll({
            where: {
              authorized_user_id: currentUser.id,
              assigned_dept_id: deptId,
            },
            include: includeRelations,
          }),
        ]);

        // Deduplicate by task ID using a Map
        const taskMap = new Map<number, Tasks>();
        [...creatorTasks, ...assignedTasks, ...authorizedTasks].forEach(task => {
          taskMap.set(task.id, task);
        });

        tasks = Array.from(taskMap.values());
      }
      const now = new Date();

      // Shape response according to permission
      const response = tasks.map(task => {
        const taskJson = task.toJSON();
        const secondaryStatus = {
          late: taskJson.finish_date ? new Date(taskJson.finish_date) < now && !['done', 'approved'].includes(taskJson.status) : false,
          not_started: taskJson.start_date ? new Date(taskJson.start_date) > now : false,
          not_assigned: !taskJson.assigned_user_id,
          created_by_me: taskJson.creator_id === req.user!.id,
          authorized_by_me: taskJson.authorized_user_id === req.user!.id,
          assigned_to_me: taskJson.assigned_user_id === req.user!.id,
          requester_milletvekili: taskJson.requester_rank ? taskJson.requester_rank === "milletvekili" : false,
          requester_kaymakamlik: taskJson.requester_rank ? taskJson.requester_rank === "kaymakamlik" : false,
          requester_muhtarlik: taskJson.requester_rank ? taskJson.requester_rank === "muhtarlik" : false,
          requester_diger: taskJson.requester_rank ? taskJson.requester_rank === "diger" : false,
        };
        const basic = {
          id: taskJson.id,
          title: taskJson.title,
          status: taskJson.status,
          secondaryStatus, // <-- ADD THIS
          requester_rank: taskJson.requester_rank,
          department: taskJson.assignedDepartment?.dept_name ?? null,
          creator: taskJson.creator?.name ?? null,
          assigned_user: taskJson.assignedUser?.name ?? null,
          authorizator: taskJson.authorizator?.name ?? null,
        };

        if (permissionLevel < 3) {
          return { ...basic, created_at: null, start_date: null, finish_date: null };
        } else {
          return {
            ...basic,
            description: taskJson.description,
            requester_name: taskJson.requester_name,
            requester_mail: taskJson.requester_mail,
            requester_phone: taskJson.requester_phone,
            created_at: taskJson.created_at?.toISOString() ?? null,
            start_date: taskJson.start_date?.toISOString() ?? null,
            finish_date: taskJson.finish_date?.toISOString() ?? null,
          };
        }
      });

      res.json(response);

    } catch (error) {
      console.error('Error in GET /departments/:id/tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks', detail: error });
    }
  }
);

const includeRelations = [
  {
    model: Users,
    as: 'assignedUser',
    attributes: ['id', 'name'],
  },
  {
    model: Users,
    as: 'authorizator',
    attributes: ['id', 'name'],
  },
  {
    model: Users,
    as: 'creator',
    attributes: ['id', 'name'],
  },
  {
    model: Departments,
    as: 'assignedDepartment',
    attributes: ['id', 'dept_name'],
  },
];


export default router;
