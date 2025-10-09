import express, { Request, Response } from 'express';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import requirePermission from '../middlewares/requirePermission.middleware.js';

import { Roles, Permissions, ActivityLogs } from '../models/index.js';
import { CreateWithUserOptions, DestroyWithUserOptions, SaveWithUserOptions, UpdateWithUserOptions } from '../types/hookparameter.js';
import { RoleAttributes } from '../models/roles.model.js';
import { PermissionAttributes } from '../models/permissions.model.js';
import RolePermissions, { RolePermissionAttributes } from '../models/rolePermissions.model.js';

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

// ✅ 1. Create a new role also it's level zero permissions
router.post('/',
  authenticateJWT,
  requirePermission('Roles', 3),
  async (req: Request, res: Response) => {
    const { role_name } = req.body;

    if (!role_name) {
      res.status(400).json({ error: 'Role name is required' });
      return;
    }

    try {
      const options: CreateWithUserOptions<RoleAttributes> = { userId: req.user!.id };
      const newRole = await Roles.create({ role_name }, options);

      // Get all categories

      // For each category, find level 0 permission
      for (const category of categories) {
        let level0 = await Permissions.findOne({
          where: { category, level: 0 },
        });

        // 🟡 If no level 0 permission exists, create it
        if (!level0) {
          console.warn(`No level 0 permission found for category: ${category}. Creating fallback.`);
          const options2: CreateWithUserOptions<PermissionAttributes> = { userId: req.user!.id };
          level0 = await Permissions.create({ category, level: 0, description: 'Nothing' }, options2);
        }
        const options3: CreateWithUserOptions<RolePermissionAttributes> = { userId: req.user!.id };

        await newRole.addPermission(level0, options3);
      }

      res.status(201).json(newRole);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create role', details: err });
    }
  }
);

// ✅ 2. PATCH: Update role name (partial update)
router.patch('/:id',
  authenticateJWT,
  requirePermission('Roles', 2),
  async (req: Request, res: Response) => {
    const roleId = parseInt(req.params.id);
    const { role_name } = req.body;
    const userId = req.user!.id;

    if (!role_name) {
      res.status(400).json({ error: 'Role name is required' });
      return;
    }

    try {
      const role = await Roles.findByPk(roleId);
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      role.role_name = role_name;

      // ✅ Pass userId in options so ActivityLogs hook can use it
      const options: SaveWithUserOptions<RoleAttributes> = { userId: req.user!.id };

      await role.save(options);

      res.json({ message: 'Role updated', role });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update role', details: err });
    }
  }
);

// ✅ 3. DELETE /roles/:roleId
router.delete('/:id',
  authenticateJWT,
  requirePermission('Roles', 3),
  async (req: Request, res: Response) => {
    const roleId = parseInt(req.params.roleId, 10);
    const userId = req.user?.id;

    if (!roleId) {
      res.status(400).json({ message: 'Missing or invalid roleId parameter' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized: userId missing' });
      return;
    }

    try {
      const role = await Roles.findByPk(roleId);

      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }

      const options: DestroyWithUserOptions<RolePermissionAttributes> = { userId: req.user!.id };
      await role.destroy(options); // This will trigger the `afterDestroy` hook

      res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// ✅ 4. Set or Replace a permission in role (one per category)
router.put('/:id/permissions',
  authenticateJWT,
  requirePermission('Roles', 2),
  async (req: Request, res: Response) => {
    const roleId = parseInt(req.params.id);
    const { permissionId } = req.body;


    if (!roleId || !permissionId) {
      res.status(400).json({ message: 'Missing roleId or permissionId' });
      return;
    }

    try {
      const newPermission = await Permissions.findByPk(permissionId);
      if (!newPermission) {
        res.status(404).json({ message: 'New permission not found' });
        return;
      }

      // Step 1: Get role's permissions (with RolePermissions join)
      const role = await Roles.findByPk(roleId, {
        include: {
          model: Permissions,
          as: 'permissions',
          through: {
            attributes: ['id', 'permissionId'],
          },
        },
      });

      if (!role) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }


      const existingPermissions = await role.getPermissions();

      // Find existing permission from the same category
      const match = existingPermissions.find(
        (p) => p.category === newPermission.category
      );

      if (match && match.RolePermissions?.id) {
        const options: CreateWithUserOptions<RolePermissionAttributes> = { userId: req.user!.id };
        await RolePermissions.update(
          { permissionId },
          {
            where: { id: match.RolePermissions.id },
            ...options, // Pass custom option for hooks
          }
        );

        res.status(200).json({
          message: `Permission updated for category '${newPermission.category}'`,
        });
      }
      else {
        res.status(400).json({ error: `Permission in the same category does not exist` });
        return;
      }
    } catch (error) {
      console.error('Error replacing permission:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// ✅ 5. Get all roles with their permissions
router.get('/',
  authenticateJWT,
  requirePermission('Roles', 1),
  async (req: Request, res: Response) => {
    try {
      const roles = await Roles.findAll({
        include: [{ model: Permissions, as: 'permissions', through: { attributes: [] } }],
      });
      res.json(roles);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch roles', details: err });
    }
  }
);

// ✅ 6. Get a single role with its permissions
router.get('/:id',
  authenticateJWT,
  requirePermission('Roles', 1),
  async (req: Request, res: Response) => {
    const roleId = parseInt(req.params.id);
    try {
      const role = await Roles.findByPk(roleId, {
        include: [{ model: Permissions, as: 'permissions', through: { attributes: [] } }],
      });

      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }

      res.json(role);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch role', details: err });
    }
  }
);

export default router;
