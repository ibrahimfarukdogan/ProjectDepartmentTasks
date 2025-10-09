import dotenv from 'dotenv';
dotenv.config();

import { Op } from 'sequelize';
import { Users, Tasks, Notifications } from '../models/index.js';

// 🚀 Helper to send push notification via Expo
async function sendPushNotification(to: string, title: string, body: string, data = {}, url: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        url, // 👈 This is your in-app route
      },
    }),
  });
}
export async function checkAndSendTaskNotifications() {
  console.log(`[${new Date().toISOString()}] Running task notification check...`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Get tasks that are due today or overdue
  const tasks = await Tasks.findAll({
    where: {
      finish_date: {
        [Op.lt]: tomorrow, // today or before
      },
      status: {
        [Op.in]: ['open', 'inprogress'], // ignore completed tasks
      },
    },
  });

  for (const task of tasks) {
    const user = await Users.findByPk(task.assigned_user_id);
    if (!user || !user.push_token) continue;

    const isOverdue = task.finish_date && task.finish_date < today;

    const title = isOverdue ? '⚠️ Geciken Görev' : '⏰ Görev Teslimi Bugün';
    const body = `Göreviniz "${task.title}" ${isOverdue ? 'gecikti' : 'bugün teslim edilmeli'}. Lütfen kontrol ediniz.`;
    const url = `/departments/${task.assigned_dept_id}/tasks/${task.id}`
    try {
      await sendPushNotification(user.push_token, title, body, {
        taskId: task.id,
        status: task.status,
      }, url);
      // 2. Save to DB 🗃️
      await Notifications.create({
        user_id: user.id,
        title: title,
        message: body,
        type: 'task',
        metadata: {
          taskId: task.id,
        },
        read: false,
        createdAt: new Date(),
        url: url
      });

      console.log(`✅ Notification sent and saved for user ${user.id} for task ${task.id}`);
    } catch (error) {
      console.error(`❌ Failed to send notification for task ${task.id}:`, error);
    }
  }

  console.log('🎯 Task notification check finished.\n');
}
export async function resendUnreadNotifications() {
  console.log('📤 Checking for unread notifications to re-push...');

  const recentUnread = await Notifications.findAll({
  where: {
    read: false,
    createdAt: {
      [Op.gte]: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // last 10 days
    },
  },
  include: [{
    model: Users,
    as: 'user', // 👈 match the alias you defined in belongsTo
  }],
});
  const userNotificationMap: Record<number, number> = {};
  for (const notif of recentUnread) {
    userNotificationMap[notif.user_id] = (userNotificationMap[notif.user_id] || 0) + 1;
  }
  // 3. Fetch users in bulk
  const userIds = Object.keys(userNotificationMap).map(id => parseInt(id));
  const users = await Users.findAll({
    where: {
      id: userIds,
      push_token: {
        [Op.ne]: null,
      } as unknown as string,
    },
  });

  // 4. Send one summary push per user
  for (const user of users) {
    const count = userNotificationMap[user.id];
    if (!count) continue;

    try {
      await sendPushNotification(
        user.push_token!,
        '🔔 Hatırlatıcı',
        `${count} sayıda okunmamış bildirimleriniz bulunmakta. Uygulamadan kontrol edebilirsiniz.`,
        {},
        '/notifications'
      );

      console.log(`📩 Summary push sent to user ${user.id} with ${count} unread notifications.`);
    } catch (error) {
      console.error(`❌ Failed to send summary push to user ${user.id}:`, error);
    }
  }

  console.log('✅ Finished sending unread notification summaries.\n');
}