import { Response } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { Role } from '../types';

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // 1. VENDOR Dashboard Flow (Data Isolation: Only Vendor's own records)
    if (user.role === Role.VENDOR) {
      const vendor = await db.findVendorByUserId(user.id);
      const vendorId = vendor ? vendor.id : undefined;

      const recentPOs = vendorId ? await db.getRecentPurchaseOrders(5, vendorId) : [];
      const totalSpend = vendorId ? await db.getMonthlySpend(vendorId) : 0;
      const pendingOrders = vendorId ? await db.getPendingApprovalsCount(vendorId) : 0;
      const totalOrdersCount = vendorId ? await db.getVendorOrdersCount(vendorId) : 0;
      const spendingTrends = vendorId ? await db.getSpendingTrends(vendorId) : [];

      const formattedSpend =
        totalSpend >= 100000
          ? `₹${(totalSpend / 100000).toFixed(2)}L`
          : `₹${totalSpend.toLocaleString('en-IN')}`;

      const summaryData = {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        vendorProfile: vendor || null,
        metrics: {
          activeRfqs: 4, // Week 2 Preview: RFQ quote invitations for this vendor
          pendingApprovals: pendingOrders, // Vendor's orders awaiting confirmation / review
          monthlyPoSpend: formattedSpend, // Total value of orders awarded to this vendor
          monthlyPoSpendRaw: totalSpend,
          overdueInvoices: 0, // Week 3 Invoices module
          totalOrdersCount,
          verificationStatus: vendor?.status || 'PENDING',
        },
        vendorCounts: {
          all: vendor ? 1 : 0,
          active: vendor?.status === 'ACTIVE' ? 1 : 0,
          pending: vendor?.status === 'PENDING' ? 1 : 0,
          blocked: vendor?.status === 'BLOCKED' ? 1 : 0,
        },
        recentPurchaseOrders: recentPOs.map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          vendor: po.vendorName || vendor?.name || 'My Company',
          amount: po.amount,
          status: po.status,
        })),
        spendingTrends,
        notice: vendor
          ? `Connected to company profile '${vendor.name}' (${vendor.gstin}). Displaying only orders and activities awarded to your organization.`
          : 'Your vendor user account is active. Awaiting company profile linkage.',
      };

      res.status(200).json({ success: true, summary: summaryData });
      return;
    }

    // 2. ADMIN, PROCUREMENT_OFFICER, MANAGER_APPROVER Dashboard Flows
    const { counts } = await db.findVendors();
    const recentPOs = await db.getRecentPurchaseOrders(5);
    const monthlySpend = await db.getMonthlySpend();
    const pendingApprovals = await db.getPendingApprovalsCount();
    const spendingTrends = await db.getSpendingTrends();
    const totalUsers = await db.getUserCount();

    const formattedSpend =
      monthlySpend >= 100000
        ? `₹${(monthlySpend / 100000).toFixed(2)}L`
        : `₹${monthlySpend.toLocaleString('en-IN')}`;

    let notice = '';
    if (user.role === Role.ADMIN) {
      notice = `System Administration Active: Overseeing ${totalUsers} user accounts, ${counts.all} vendor records, and organizational purchase orders.`;
    } else if (user.role === Role.PROCUREMENT_OFFICER) {
      notice = `Procurement Operations: Managing ${counts.active} active suppliers, ${counts.pending} pending verifications, and purchase order fulfillment.`;
    } else if (user.role === Role.MANAGER_APPROVER) {
      notice = `Approvals & Budget Control: ${pendingApprovals} purchase order(s) awaiting managerial review. ${formattedSpend} total approved commitments.`;
    }

    const summaryData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      metrics: {
        activeRfqs: 12, // Week 2 Preview module (quote aggregation workflow unlocks in Week 2)
        pendingApprovals, // Live count of purchase orders in PENDING status from DB
        monthlyPoSpend: formattedSpend, // Live aggregated sum of APPROVED purchase orders from DB
        monthlyPoSpendRaw: monthlySpend,
        overdueInvoices: 3, // Week 3 Preview module (invoice aging workflow unlocks in Week 3)
        totalUsers, // Live count of active users in database
        activeSuppliers: counts.active,
        pendingVerifications: counts.pending,
      },
      vendorCounts: counts,
      recentPurchaseOrders: recentPOs.map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        vendor: po.vendorName || 'Verified Supplier',
        amount: po.amount,
        status: po.status,
      })),
      spendingTrends,
      notice,
    };

    res.status(200).json({ success: true, summary: summaryData });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to load dashboard metrics' });
  }
};
