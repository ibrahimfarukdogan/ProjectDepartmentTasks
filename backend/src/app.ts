import express from 'express';
import userRoutes from './routes/users.routes.js';
import departmentsRoutes from './routes/departments.routes.js';
import permissionRoutes from './routes/permissions.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import authRoutes from './routes/auth.routes.js';
import sequelize from './db/db.js';
import dotenv from 'dotenv';
import './models/index.js';
import cors, { CorsOptions } from 'cors'
import cron from 'node-cron';
import { checkAndSendTaskNotifications, resendUnreadNotifications } from './scripts/taskNotificationCron.js';

dotenv.config();
const app = express();

const whitelist: string[] = [
  'http://localhost:8081',
  'https://ohjbxh0-anonymous-8081.exp.direct',
  'http://10.0.2.2:8081',
  process.env.FRONTEND_ORIGIN || '', // fallback to empty string if undefined
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const expoRegex = /^https:\/\/[a-z0-9-]+\.exp\.direct$/;

    if (!origin || whitelist.includes(origin) || expoRegex.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
};

//app.use(cors(corsOptions));
app.use(cors({
  origin: true, // allows any origin
  credentials: true,
}));

app.use(express.json());
app.use('/login', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/tasks', tasksRoutes);

//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    //custom query sequelize query: sql injection önlemleri almalı
    
    //await sequelize.sync({ alter: true });
    //console.log('All models synced, join tables created');

app.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${process.env.PORT}`);
});

    cron.schedule('0 11 * * *', async () => {
      console.log('[CRON] Running check');
      try {
        await checkAndSendTaskNotifications();
      } catch (err) {
        console.error('Error in check cron:', err);
      }
    });

    cron.schedule('0 14 * * *', async () => {
      console.log('[CRON] Running resend');
      try {
        await resendUnreadNotifications();
      } catch (err) {
        console.error('Error in resend cron:', err);
      }
    });

  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

startServer();

export default app;