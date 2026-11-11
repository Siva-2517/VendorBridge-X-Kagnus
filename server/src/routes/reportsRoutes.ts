import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getReportsOverview, exportReportsCsv } from '../controllers/reportsController';

const router = Router();

// Strict authentication enforcement for all reporting endpoints
router.use(authenticate);

// Reports overview metrics & visualizer dataset
router.get('/overview', getReportsOverview);

// Secure CSV export endpoint
router.get('/export', exportReportsCsv);

export default router;
