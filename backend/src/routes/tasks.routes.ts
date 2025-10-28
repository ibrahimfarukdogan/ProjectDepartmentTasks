import express, { Request, Response } from 'express';
import { Tasks, Users, TaskComments, Departments, Notifications } from '../models/index.js';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import requirePermission from '../middlewares/requirePermission.middleware.js';
import { CheckOwnAndSubDeparmentAllowance, getOwnAndSubDepartments, getUserPermissions, hasPermission, sendTaskAssignmentNotifications, sendTaskStatusNotification, validateUserBelongsToDepartment } from '../utils/utils.js';
import { CreateWithUserOptions, DestroyWithUserOptions, SaveWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';
import { TaskAttributes } from '../models/tasks.model.js';
import { TaskCommentAttributes } from '../models/taskComments.model.js';
import { Sequelize } from 'sequelize';
import { TaskStats } from '../types/stats.js';

const router = express.Router();


// 🔸 1. Create Task
router.post('/',
  authenticateJWT,
  requirePermission('Tasks', 3),
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        assigned_dept_id,
        assigned_user_id,
        start_date,
        finish_date,
        requester_name,
        requester_mail,
        requester_phone,
        requester_rank,
      } = req.body;

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      if (!assigned_dept_id) {
        res.status(400).json({ error: 'Task must be assigned to at least a department.' });
        return;
      }
      const departmentAssign = await Departments.findByPk(assigned_dept_id);
      if (!departmentAssign) {
        res.status(404).json({ error: 'Assigned Department not found' });
        return;
      }
      const userDepartments = await currentUser.getMember_departments();
      const userPermissions = await getUserPermissions(currentUser);
      const hasDeptLevel2 = hasPermission(userPermissions, 'Departments', 2);


      const isAuthorized = hasDeptLevel2
      ? await CheckOwnAndSubDeparmentAllowance(assigned_dept_id, userDepartments)
      : userDepartments.some(d => d.id === assigned_dept_id);
      if (!isAuthorized)
      {
         res.status(403).json({ error: 'You are not authorized for this department.' })
        return;
      }

      // ✅ If a user is assigned, validate they belong to the department
      if (assigned_user_id) {
        const isValid = await validateUserBelongsToDepartment(assigned_user_id, assigned_dept_id);
        if (!isValid) {
          res.status(400).json({ error: 'Assigned user must belong to the assigned department.' });
          return;
        }
      }

      const options: CreateWithUserOptions<TaskAttributes> = { userId: req.user!.id, };

      // ✅ 3. Create the task
      const newTask = await Tasks.create({
        creator_id: req.user!.id,
        authorized_user_id: req.user!.id,
        title,
        description,
        status: 'open',
        assigned_dept_id,
        assigned_user_id,
        start_date,
        finish_date,
        requester_name,
        requester_mail,
        requester_phone,
        requester_rank,
      }, options);
      await sendTaskAssignmentNotifications(newTask);

      res.status(201).json(newTask);
    } catch (err) {
      console.error('Create Task Error:', err);
      res.status(500).json({ error: 'Failed to create task', details: err });
    }
  }
);

// 🔸 2. Update Task (non-status fields)
router.put('/:id',
  authenticateJWT,
  requirePermission('Tasks', 3),
  async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }

      const task = await Tasks.findByPk(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const {
        title,
        description,
        start_date,
        finish_date,
        requester_name,
        requester_mail,
        requester_phone,
        requester_rank,
        assigned_dept_id,
        assigned_user_id,
      } = req.body;

      const isRelatedUser =
        req.user!.id === task.creator_id ||
        req.user!.id === task.authorized_user_id ||
        req.user!.id === task.assigned_user_id;

      // 🧠 Determine effective assigned values
      const newAssignedDeptId = assigned_dept_id ?? task.assigned_dept_id;
      const newAssignedUserId = assigned_user_id ?? task.assigned_user_id;

      // 🔁 Cross-check: Both assigned_dept_id and assigned_user_id must be present together
      if (assigned_dept_id || assigned_user_id) {
        // 🔒 Check permission to assign to this department
        const userDepartments = await currentUser.getMember_departments();
        const isAuthorized = await CheckOwnAndSubDeparmentAllowance(newAssignedDeptId, userDepartments);
        if (!isAuthorized) {
          res.status(403).json({ error: 'You are not allowed to update tasks to this department.' });
          return;
        }

        // 🔒 Validate user belongs to department (if user provided)
        if (newAssignedUserId) {
          const isValid = await validateUserBelongsToDepartment(newAssignedUserId, newAssignedDeptId);
          if (!isValid) {
            res.status(400).json({ error: 'Assigned user must belong to the assigned department.' });
            return;
          }
        }

        // ✅ Set new assignment values
        task.assigned_dept_id = newAssignedDeptId;
        task.assigned_user_id = newAssignedUserId;

        if (isRelatedUser) {
          task.authorized_user_id = req.user!.id;
        }
        if ((assigned_user_id !== undefined && assigned_user_id !== task.assigned_user_id) ||
          (assigned_dept_id !== undefined && assigned_dept_id !== task.assigned_dept_id)) {
          await sendTaskAssignmentNotifications(task);
        }
      }

      // ✅ Update editable fields if provided
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (start_date !== undefined) task.start_date = start_date;
      if (finish_date !== undefined) task.finish_date = finish_date;
      if (requester_name !== undefined) task.requester_name = requester_name;
      if (requester_mail !== undefined) task.requester_mail = requester_mail;
      if (requester_phone !== undefined) task.requester_phone = requester_phone;
      if (requester_rank !== undefined) task.requester_rank = requester_rank;

      const options: SaveWithUserOptions<TaskAttributes> = { userId: req.user!.id };
      await task.save(options);

      res.status(200).json(task);
    } catch (err) {
      console.error('Update Task Error:', err);
      res.status(500).json({ error: 'Failed to update task', details: err });
    }
  }
);

// 🔸 3. Update Task Status
router.patch('/:id/status',
  authenticateJWT,
  requirePermission('Tasks', 2),
  async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    const { status } = req.body;

    try {
      const task = await Tasks.findByPk(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const currentUser = await Users.findByPk(req.user!.id);
      if (!currentUser) {
        res.status(401).json({ error: 'Invalid user' });
        return;
      }

      const AssignedDeptId = task.assigned_dept_id;

        const userDepartments = await currentUser.getMember_departments();
        const isAuthorizedd = await CheckOwnAndSubDeparmentAllowance(AssignedDeptId, userDepartments);
        if (!isAuthorizedd) {
          res.status(403).json({ error: 'You are not allowed to update tasks of this department.' });
          return;
        }

      const userId = req.user!.id;
      const isAssigned = task.assigned_user_id === userId;
      const isAuthorized = task.authorized_user_id === userId;
      const currentStatus = task.status;

      if (req.permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }
      const restrictedStatuses = ['open', 'inprogress', 'done'];
      const now = new Date();
      if (
        restrictedStatuses.includes(status) &&
        task.start_date &&
        task.start_date > now
      ) {
        res.status(400).json({
          error: `Cannot set status to '${status}' because start_date is in the future.`,
          start_date: task.start_date,
          current_time: now,
        });
        return;
      }
      const permittedStatus = req.permissionLevel === 2
        ? (isAssigned && ['open', 'inprogress', 'done'].includes(status))
        : req.permissionLevel === 3
          ? (
            (isAuthorized && ['open', 'cancelled'].includes(status)) ||
            (isAuthorized && currentStatus === 'done' && ['approved', 'cancelled'].includes(status))
          )
          : req.permissionLevel >= 4;

      if (!permittedStatus) {
        res.status(403).json({ error: 'Not allowed to change status' });
        return;
      }

      task.status = status;

      const options: SaveWithUserOptions<TaskAttributes> = {
        userId: req.user!.id,
      };

      await task.save(options);

      if (currentStatus !== status) {
        await sendTaskStatusNotification(task, status, userId);
      }

      res.json({ message: 'Status updated', task });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update task status', details: err });
    }
  }
);

// 🔸 4. Add Comment to Task
router.post('/:taskId/comments',
  authenticateJWT,
  requirePermission('Comments', 1),
  async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    const userId = req.user!.id;

    try {
      const task = await Tasks.findByPk(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const canComment =
        req.permissionLevel === 1
          ? [task.assigned_user_id, task.creator_id, task.authorized_user_id].includes(userId)
          : true;

      if (!canComment) {
        res.status(403).json({ error: 'Not authorized to comment' });
        return;
      }
      const options: CreateWithUserOptions<TaskCommentAttributes> = {
        userId,
      };

      const comment = await TaskComments.create({
        task_id: taskId,
        commenter_user_id: userId,
        comment: req.body.comment,
        image_url: req.body.image_url,
      }, options);

      res.status(201).json({ message: 'Comment added', comment });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add comment', details: err });
    }
  }
);

// 🔸 5. Edit Comment
router.put('/:taskId/comments/:commentId',
  authenticateJWT,
  requirePermission('Comments', 1),
  async (req: Request, res: Response) => {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user!.id;

    try {
      const comment = await TaskComments.findByPk(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }
      if (req.permissionLevel === undefined) {
        res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
        return;
      }
      if (comment.commenter_user_id !== userId && req.permissionLevel < 2) {
        res.status(403).json({ error: 'Not allowed to edit this comment' });
        return;
      }

      const options: UpdateWithUserOptions<TaskCommentAttributes> = {
        userId,
      };

      await comment.update({
        comment: req.body.comment,
        image_url: req.body.image_url,
      }, options);

      res.json({ message: 'Comment updated', comment });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update comment', details: err });
    }
  }
);

// 🔸 6. Delete Comment
router.delete('/:taskId/comments/:commentId',
  authenticateJWT,
  requirePermission('Comments', 1),
  async (req: Request, res: Response) => {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user!.id;
    if (req.permissionLevel === undefined) {
      res.status(500).json({ error: 'Permission level not set. Middleware may be missing.' });
      return;
    }
    const permissionLevel = req.permissionLevel;

    try {
      const comment = await TaskComments.findByPk(commentId);

      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      // ✅ Permission Check
      const isOwner = comment.commenter_user_id === userId;
      const canDelete =
        permissionLevel === 1 ? isOwner : permissionLevel >= 2;

      if (!canDelete) {
        res.status(403).json({ error: 'You are not authorized to delete this comment' });
        return;
      }

      // ✅ Delete comment with userId in options for logging
      const options: DestroyWithUserOptions<TaskCommentAttributes> = {
        userId,
      };

      await comment.destroy(options);

      res.json({ message: 'Comment deleted' });
    } catch (err) {
      console.error('Delete Comment Error:', err);
      res.status(500).json({ error: 'Failed to delete comment', details: err });
    }
  }
);

export default router;
