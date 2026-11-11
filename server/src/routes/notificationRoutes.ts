import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController';

const router = Router();

// All notification routes strictly require authentication
router.use(authenticate);

// List notifications & unread count
router.get('/', getNotifications);
router.get('/unread-count', getUnreadNotificationCount);

// Read state updates
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

export default router;
