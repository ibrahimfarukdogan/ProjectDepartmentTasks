import express, { Request, Response } from 'express';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import requirePermission from '../middlewares/requirePermission.middleware.js';
import { Users, Departments, Roles, Tasks, DepartmentMembers } from '../models/index.js';
import { getOwnAndSubDepartments } from '../utils/utils.js';
import { CreateWithUserOptions, DestroyWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';
import { DepartmentAttributes } from '../models/departments.model.js';
import { DepartmentMemberAttributes } from '../models/departmentMembers.model.js';
import { Sequelize, Op } from 'sequelize';
import { DetailedDepartmentStatsResponse, DetailedDepartmentTaskStats, DetailedDepartmentTaskUsers, emptyTaskStats, emptyUserStats, TaskStats } from '../types/stats.js';

const router = express.Router();

/**
 * GET /api/departments
 * List all accessible departments
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
        console.log("not found");
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

      const subDepartments = subDepartmentIds.length
        ? await Departments.findAll({ where: { id: subDepartmentIds } })
        : [];

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
        // Level 1: Only own departments
        isAuthorized = userDepartments.some(d => d.id === deptId);
      } else {
        // Level 2+: Own or sub-departments
        for (const dept of userDepartments) {
          const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);
          if (allowedSubDeptIds.includes(deptId)) {
            isAuthorized = true;
            break;
          }
        }
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

      // Send full department info
      res.json(department);

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

      let accessibleIds: number[] = [];
      let isAuthorized = false;
      const userDepartments = await currentUser.getMember_departments();

      isAuthorized = userDepartments.some(d => d.id === deptId);
      if (!isAuthorized && permissionLevel >= 2) {
        for (const dept of userDepartments) {
          const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);

          if (allowedSubDeptIds.includes(deptId)) {
            isAuthorized = true;
            break;
          }
        }
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
 * GET /api/departments/:deptId/users/:userId
 * Get a single user of a department (if allowed)
 */
router.get('/:deptId/users/:userId',
  authenticateJWT,
  requirePermission('Departments', 1),
  async (req: Request, res: Response) => {
    try {
      const deptId = parseInt(req.params.deptId);
      const targetUserId = parseInt(req.params.userId);

      if (isNaN(deptId) || isNaN(targetUserId)) {
        res.status(400).json({ error: 'Invalid department or user ID' });
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

      // Check access to the requested department
      let isAuthorized = userDepartments.some(d => d.id === deptId);

      if (!isAuthorized && permissionLevel >= 2) {
        for (const dept of userDepartments) {
          const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);
          if (allowedSubDeptIds.includes(deptId)) {
            isAuthorized = true;
            break;
          }
        }
      }

      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to view this department' });
        return;
      }

      const dept = await Departments.findByPk(deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      // Check if the target user is a member of the department
      const members = await dept.getMembers({ where: { id: targetUserId }, include: [{ model: Roles, as: 'role', attributes: ['id', 'role_name'] }] });

      if (members.length === 0) {
        res.status(404).json({ error: 'User not found in this department' });
        return;
      }

      const targetUser = members[0].toJSON();

      if (permissionLevel === 1) {
        // Limited info for level 1 users
        res.json({
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.mail,
          role: targetUser.role?.role_name ?? null
        });
        return;
      } else {
        // Full info for level 2+
        const { password, ...safeUser } = targetUser;
        res.json(safeUser);
        return;
      }

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching user', error: err });
    }
  }
);

/**
 * POST /api/departments
 * Create a department (Level 3 required)
 */
router.post('/',
  authenticateJWT,
  requirePermission('Departments', 4),
  async (req: Request, res: Response) => {
    const { dept_name, parent_id } = req.body;

    try {
      if (!parent_id || isNaN(parent_id) || parent_id <= 0) {
        res.status(400).json({ error: 'parent_id is required and must be a positive number' });
      }

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();
      let isAuthorized = false;

      for (const dept of userDepartments) {
        const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);
        if (allowedSubDeptIds.includes(parent_id)) {
          isAuthorized = true;
          break;
        }
      }

      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to assign parent_id' });
        return;
      }

      const option: CreateWithUserOptions<DepartmentAttributes> = { userId: req.user!.id };
      const newDept = await Departments.create({ dept_name, parent_id }, option);
      res.status(201).json(newDept);

    } catch (err) {
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
    const { dept_name, parent_id } = req.body;

    try {
      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const userDepartments = await currentUser.getMember_departments();
      let isAuthorized = false;

      // Check if user is authorized to update this department
      for (const dept of userDepartments) {
        const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);
        if (allowedSubDeptIds.includes(deptId)) {
          isAuthorized = true;
          break;
        }
      }

      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to update this department' });
        return;
      }

      // If parent_id is being changed, validate it
      if (parent_id && parent_id > 0) {
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

      const dept = await Departments.findByPk(deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const option: UpdateWithUserOptions<DepartmentAttributes> = { userId: req.user!.id };
      await dept.update({ dept_name, parent_id }, option);
      res.json(dept);

    } catch (err) {
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
      let isAuthorized = false;

      for (const dept of userDepartments) {
        const allowedSubDeptIds = await getOwnAndSubDepartments(dept.id);
        if (allowedSubDeptIds.includes(deptId)) {
          isAuthorized = true;
          break;
        }
      }

      if (!isAuthorized) {
        res.status(403).json({ error: 'Not authorized to delete this department' });
        return;
      }

      const dept = await Departments.findByPk(deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found' });
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

// Add user to department (via belongsToMany)
router.post('/:id/users/add',
  authenticateJWT,
  requirePermission('Departments', 3),
  async (req: Request, res: Response) => {
    const deptId = parseInt(req.params.id);
    const { userId } = req.body;

    try {
      const department = await Departments.findByPk(deptId);
      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const user = await Users.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const members = await department.getMembers({ where: { member_id: userId } });
      if (members.length > 0) {
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

// Remove user from a department (via belongsToMany)
router.delete('/:id/users/:userId/remove',
  authenticateJWT,
  requirePermission('Departments', 3),
  async (req: Request, res: Response) => {
    const deptId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    try {
      const department = await Departments.findByPk(deptId);
      const user = await Users.findByPk(userId);

      if (!department || !user) {
        res.status(404).json({ error: 'Department or User not found' });
        return;
      }

      // Remove user from department (via belongsToMany)
      await department.removeMember(user); // uses the alias "members"

      res.json({ message: 'User removed from department' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error removing user from department', error: err });
    }
  }
);

// View Mini Task Statistics
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
      const department = await Departments.findByPk(departmentId);

      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const userId = req.user!.id;

      if (req.permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }

      const permissionLevel = req.permissionLevel;

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

// View Full Department Statistics
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
      const department = await Departments.findByPk(departmentId);
      if (!department) {
        res.status(404).json({ error: 'Department not found' });
        return;
      }

      const userId = req.user!.id;

      // ---------------------- TASK STATS ----------------------
      const taskStatsRaw = await Tasks.findOne({
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'open' THEN 1 END`)), 'open'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'inprogress' THEN 1 END`)), 'inprogress'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'done' THEN 1 END`)), 'done'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'approved' THEN 1 END`)), 'approved'],
          [Sequelize.fn('COUNT', Sequelize.literal(`CASE WHEN status = 'cancelled' THEN 1 END`)), 'cancelled'],
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


export default router;
