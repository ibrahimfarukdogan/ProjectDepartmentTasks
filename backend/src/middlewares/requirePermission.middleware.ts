import { Request, Response, NextFunction } from 'express';
import { Users, Roles, Permissions } from '../models/index.js'; // Adjust as needed
import { getUserPermissions } from '../utils/utils.js';

export default function requirePermission(category: string, minLevel: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Invalid token or user ID missing' });
        return;
      }

      const user = await Users.findByPk(userId);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized: User not found' });
        return;
      }

      const userPermissions = await getUserPermissions(user);

      const permission = userPermissions.find(p => p.category === category);
      const userLevel = permission?.level ?? 0;

      req.permissionLevel = userLevel; // ✅ attach actual user level, not just required level

      if (userLevel >= minLevel) {
        next(); // ✅ permission granted
        return;
      }

      res.status(403).json({
        error: `Forbidden: Requires '${category}' level ${minLevel}, but you have level ${userLevel}`,
      });

    } catch (err) {
      console.error('Permission middleware error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}