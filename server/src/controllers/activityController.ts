import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getActivityLogs } from '../services/activityService';

/**
 * GET /api/activity
 * Retrieves paginated audit and activity logs with role-based visibility and filters.
 */
export const getActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const category = req.query.category as string | undefined;
    const action = req.query.action as string | undefined;
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await getActivityLogs(
      req.user,
      {
        page: isNaN(page) ? 1 : page,
        limit: isNaN(limit) ? 20 : limit,
        category,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        search,
      }
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      error: 'ServerError',
      message: error.message || 'Failed to retrieve activity timeline',
    });
  }
};
