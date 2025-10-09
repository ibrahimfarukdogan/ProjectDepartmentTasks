import { Request, Response, NextFunction } from 'express';
import { Users, Roles, Permissions } from '../models/index.js'; // Adjust as needed

export default function requirePermission(category: string, minLevel: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized: Invalid token or user ID missing' });
        return;
      }

      const userId = req.user.id;

      const user = await Users.findByPk(userId, {
        include: [{
          model: Roles,
          as: 'role',
          include: [{
            model: Permissions,
            as: 'permissions',
            through: { attributes: [] },
          }],
        }],
      });

      if (!user || !user.role || !user.role.permissions) {
        res.status(403).json({ error: `Forbidden: Role or permissions not found for user` });
        return;
      }

      const permission = user.role.permissions.find(p => p.category === category);
      if (!permission || typeof permission.level !== 'number') {
        res.status(403).json({ error: 'Forbidden: Permission not found or invalid' });
        return;
      }
      const userLevel = permission?.level ?? 0;

      if (userLevel >= minLevel) {
        req.permissionLevel = userLevel; // Optional: set for later use
        next();
        return;
      }

      res.status(403).json({
        error: `Forbidden: Requires '${category}' level ${minLevel}, user has ${userLevel}`,
      });
    } catch (err) {
      console.error('Permission middleware error:', err instanceof Error ? err.stack : err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
