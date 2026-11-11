import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import { NotificationType } from '../types';

/**
 * GET /api/notifications
 * Lists current user's notifications with pagination and filters
 */
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
    const type = req.query.type ? (req.query.type as NotificationType) : undefined;

    const result = await getUserNotifications(req.user.id, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      unreadOnly,
      type,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'ServerError', message: error.message || 'Failed to retrieve notifications' });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns count of unread notifications for current user
 */
export const getUnreadNotificationCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const unreadCount = await getUnreadCount(req.user.id);
    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'ServerError', message: error.message || 'Failed to retrieve unread count' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read for the authenticated user
 */
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Validation Error', message: 'Notification ID is required' });
      return;
    }

    const notification = await markAsRead(req.user.id, id);
    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error: any) {
    if (error.status === 404) {
      res.status(404).json({ error: 'Not Found', message: error.message });
      return;
    }
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'ServerError', message: error.message || 'Failed to mark notification as read' });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications as read for current user
 */
export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const result = await markAllAsRead(req.user.id);
    res.status(200).json({
      success: true,
      markedCount: result.markedCount,
    });
  } catch (error: any) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'ServerError', message: error.message || 'Failed to mark all notifications as read' });
  }
};
