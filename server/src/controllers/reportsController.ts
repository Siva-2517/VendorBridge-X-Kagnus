import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { reportsService } from '../services/reportsService';

/**
 * GET /api/reports/overview
 * Authenticated reporting endpoint providing KPI metrics, spend trends, category breakdown,
 * vendor rankings, and status distributions.
 */
export const getReportsOverview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { period, startDate, endDate } = req.query;

    const overview = await reportsService.getOverview(
      { id: req.user.id, role: req.user.role },
      {
        period: typeof period === 'string' ? period : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      }
    );

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error('Reports overview error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: 'Failed to retrieve reports overview',
      message: error.message || 'Server error',
    });
  }
};

/**
 * GET /api/reports/export
 * Exports RFC 4180 compliant CSV of procurement and invoice records with formula injection protection
 */
export const exportReportsCsv = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { period, startDate, endDate } = req.query;

    const { filename, csvContent } = await reportsService.exportCsv(
      { id: req.user.id, role: req.user.role },
      {
        period: typeof period === 'string' ? period : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      }
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Reports export error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: 'Failed to export reports CSV',
      message: error.message || 'Server error',
    });
  }
};
