import express from 'express';
import { Request, Response } from 'express';
import {Permissions, Roles, Users} from '../models/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authenticateJWT from '../middlewares/authjwt.middleware.js';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
   const { mail, password } = req.body;

  try {
    // Find user by username
    const user = await Users.findOne({
      where: { mail },
      include: [
        {
          model: Roles,
          as: 'role',
          include: [
            {
              model: Permissions,
              as: 'permissions',
              attributes: ['id', 'category', 'level', 'description'],
              through: { attributes: [] }, // hide junction table data
            },
          ],
        },
      ],
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid mail or password' });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ message: 'Invalid mail or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, mail: user.mail },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

// 🧠 Structure permissions cleanly for frontend use
    const permissions = (user.role?.permissions ?? []).map((p) => ({
      category: p.category,
      level: p.level,
    }));

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        mail: user.mail,
        role: user.role?.role_name,
        role_id: user.role_id,
        permissions,
      },
    });
  } catch (error) {
  console.error('Login error:', error); // 👈 Bu satırı ekle
  res.status(500).json({ message: 'Server error' });
}
});

router.post('/push-token', authenticateJWT, async (req: Request, res: Response) => {
  const { push_token } = req.body;
  const userId = req.user?.id;

  if (!userId || !push_token) {
     res.status(400).json({ message: 'User ID or push token missing' });
      return;
  }

  try {
    await Users.update({ push_token }, { where: { id: userId } });
    res.json({ message: 'Push token saved successfully' });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ message: 'Failed to save push token' });
  }
});

export default router;