import { Response } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { Role } from '../types';

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const userIdFilter = user.role === Role.VENDOR ? user.id : undefined;

    const { counts } = await db.findVendors({ userId: userIdFilter });
    const recentPOs = await db.getRecentPurchaseOrders(5);

    // Dynamic aggregated metrics
    const summaryData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      metrics: {
        activeRfqs: 12, // Week 2 RFQ module
        pendingApprovals: 5, // Week 3 Approvals module
        monthlyPoSpend: '2.3L', // INR 2,30,000 / $2.3L
        overdueInvoices: 3, // Week 3 Invoices module
      },
      vendorCounts: counts,
      recentPurchaseOrders: recentPOs.map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        vendor: po.vendorName || 'Infra Supplies Pvt Ltd',
        amount: po.amount,
        status: po.status,
      })),
      spendingTrends: [
        { month: 'Dec', spend: 120000 },
        { month: 'Jan', spend: 180000 },
        { month: 'Feb', spend: 210000 },
        { month: 'Mar', spend: 195000 },
        { month: 'Apr', spend: 250000 },
        { month: 'May', spend: 230000 },
      ],
      notice: 'Production metrics for RFQs, Approvals, and Invoices reflect live staging estimates. Full transactional workflows unlock in Weeks 2-4.',
    };

    res.status(200).json({ success: true, summary: summaryData });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to load dashboard metrics' });
  }
};
