import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getActivity } from '../controllers/activityController';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

// List activities with role-based visibility and filters
router.get('/', getActivity);

export default router;
