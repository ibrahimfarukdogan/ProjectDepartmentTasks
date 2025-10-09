import express, { Request, Response } from 'express';
import {Notifications} from '../models/index.js';
import authenticateJWT from '../middlewares/authjwt.middleware.js';
import { Sequelize, Op } from 'sequelize';


const router = express.Router();

// GET /notifications?days=10&page=1&limit=20
// Returns last N days notifications (paginated)
router.get('/', authenticateJWT, async (req, res) => {
  const days = parseInt(req.query.days as string) || 10;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const notifications = await Notifications.findAll({
    where: {
      user_id: req.user!.id,
      createdAt: { [Op.gte]: sinceDate },
    },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  res.json(notifications);
});

// PUT /notifications/mark-all-read
router.put('/mark-all-read', authenticateJWT, async (req, res) => {
  const days = parseInt(req.body.days) || 10;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const [updated] = await Notifications.update(
    { read: true },
    {
      where: {
        user_id: req.user!.id,
        createdAt: { [Op.gte]: sinceDate },
        read: false,
      },
    }
  );

  res.json({ updatedCount: updated });
});

// GET /notifications/unread-count?days=10
router.get('/unread-count', authenticateJWT, async (req, res) => {
  const days = parseInt(req.query.days as string) || 10;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const count = await Notifications.count({
    where: {
      user_id: req.user!.id,
      createdAt: { [Op.gte]: sinceDate },
      read: false,
    },
  });

  res.json({ unreadCount: count });
});

export default router;
