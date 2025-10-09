import express, { Request, Response } from 'express';
import { Permissions } from '../models/index.js';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import requirePermission from '../middlewares/requirePermission.middleware.js';
import { CreateWithUserOptions, DestroyWithUserOptions, SaveWithUserOptions } from '../types/hookparameter.js';
import { PermissionAttributes } from '../models/permissions.model.js';

const router = express.Router();

// ✅ Get all permissions
router.get(
  '/',
  authenticateJWT,
  requirePermission('Permissions', 1),
  async (req: Request, res: Response) => {
    try {
      const permissions = await Permissions.findAll();
      res.json(permissions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch permissions', details: err });
    }
  }
);

// ✅ Get a specific permission by ID
router.get(
  '/:id',
  authenticateJWT,
  requirePermission('Permissions', 1),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    try {
      const permission = await Permissions.findByPk(id);
      if (!permission) {
        res.status(404).json({ error: 'Permission not found' });
        return;
      }
      res.json(permission);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch permission', details: err });
    }
  }
);

// ✅ Create a new permission
router.post(
  '/',
  authenticateJWT,
  requirePermission('Permissions', 2),
  async (req: Request, res: Response) => {
    const { category, level, description } = req.body;

    try {
      const existing = await Permissions.findOne({ where: { category, level } });
      if (existing) {
        res.status(409).json({ error: 'Permission with same category and level already exists' });
        return;
      }

      const options: CreateWithUserOptions<PermissionAttributes> = { userId: req.user!.id };

      const permission = await Permissions.create({ category, level, description }, options);
      res.status(201).json(permission);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create permission', details: err });
    }
  }
);

// ✅ Update an existing permission
router.put(
  '/:id',
  authenticateJWT,
  requirePermission('Permissions', 2),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { category, level, description } = req.body;

    try {
      const permission = await Permissions.findByPk(id);
      if (!permission) {
        res.status(404).json({ error: 'Permission not found' });
        return;
      }

      permission.category = category ?? permission.category;
      permission.level = level ?? permission.level;
      permission.description = description ?? permission.description;
      const options: SaveWithUserOptions<PermissionAttributes> = { userId: req.user!.id };

      await permission.save(options);

      res.json(permission);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update permission', details: err });
    }
  }
);

// ✅ Delete a permission
router.delete(
  '/:id',
  authenticateJWT,
  requirePermission('Permissions', 2),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    try {
      const permission = await Permissions.findByPk(id);
      if (!permission) {
        res.status(404).json({ error: 'Permission not found' });
        return;
      }
      const options: DestroyWithUserOptions<PermissionAttributes> = { userId: req.user!.id };

      await permission.destroy(options);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete permission', details: err });
    }
  }
);

export default router;
