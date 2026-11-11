import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import {
  Role,
  ReportsOverviewResponse,
  ReportKpiMetrics,
  MonthlySpendTrendItem,
  CategorySpendItem,
  TopVendorSpendItem,
  StatusDistributionItem,
  VendorPerformanceMetrics,
} from '../types';

export interface ReportFilterOptions {
  period?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * OWASP-compliant CSV Cell Sanitization
 * Strictly mitigates Spreadsheet Formula Injection (CSV Injection)
 * Escapes quotes and encloses delimiters (commas, quotes, newlines) per RFC 4180
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Prevent formula injection if cell begins with =, +, -, @, tab, or carriage return
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 escaping
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Validates and parses reporting timeframe boundaries
 */
export function parseReportDateRange(
  period: string = '12m',
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date; periodKey: string } {
  const now = new Date();

  if (customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const err: any = new Error('Invalid date format provided for custom date range');
      err.statusCode = 400;
      throw err;
    }

    if (start > end) {
      const err: any = new Error('Start date cannot be later than end date');
      err.statusCode = 400;
      throw err;
    }

    return { startDate: start, endDate: end, periodKey: 'custom' };
  }

  const periodKey = period.toLowerCase();
  let startDate: Date;

  switch (periodKey) {
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '12m':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = new Date('2020-01-01T00:00:00.000Z');
      break;
    default:
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  return { startDate, endDate: now, periodKey };
}

/**
 * Formats monetary amounts in standard Indian Rupee notation (INR)
 */
export function formatCurrencyInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export class ReportsService {
  /**
   * Retrieves comprehensive reports and analytics overview with role-based scoping
   */
  public async getOverview(
    currentUser: { id: string; role: Role },
    options: ReportFilterOptions = {}
  ): Promise<ReportsOverviewResponse> {
    const { startDate, endDate, periodKey } = parseReportDateRange(
      options.period,
      options.startDate,
      options.endDate
    );

    // 1. Resolve Vendor scope if user is VENDOR
    let vendorId: string | undefined;
    if (currentUser.role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: currentUser.id },
      });
      if (!vendor) {
        // Return empty reports structure if vendor profile is unlinked
        return this.getEmptyOverview(periodKey, startDate, endDate);
      }
      vendorId = vendor.id;
    }

    // 2. Query Invoices within the timeframe
    const invoiceWhere: Prisma.InvoiceWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      ...(vendorId ? { vendorId } : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        vendor: true,
        purchaseOrder: {
          include: {
            rfq: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also query all paid invoices in the date range specifically (checked against paidAt or createdAt)
    const paidInvoicesWhere: Prisma.InvoiceWhereInput = {
      status: 'PAID',
      OR: [
        { paidAt: { gte: startDate, lte: endDate } },
        { paidAt: null, createdAt: { gte: startDate, lte: endDate } },
      ],
      ...(vendorId ? { vendorId } : {}),
    };

    const paidInvoices = await prisma.invoice.findMany({
      where: paidInvoicesWhere,
      include: {
        vendor: true,
        purchaseOrder: {
          include: {
            rfq: true,
          },
        },
      },
    });

    // 3. KPI Calculations
    // 3.1 Total Spend: Sum of all invoices with persisted PAID status
    const totalSpend = paidInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const formattedTotalSpend = formatCurrencyInr(totalSpend);

    // 3.2 Active Vendors: Actual vendor status field
    let activeVendorsCount = 0;
    if (vendorId) {
      const ownVendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      activeVendorsCount = ownVendor?.status === 'ACTIVE' ? 1 : 0;
    } else {
      activeVendorsCount = await prisma.vendor.count({ where: { status: 'ACTIVE' } });
    }

    // 3.3 PO Fulfillment Rate (Completed PO Rate)
    // Non-cancelled POs in the period that have been fully invoiced & paid
    const poWhere: Prisma.PurchaseOrderWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
      ...(vendorId ? { vendorId } : {}),
    };

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: poWhere,
      include: {
        invoice: true,
        rfq: true,
        vendor: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEligiblePOsCount = purchaseOrders.length;
    // Hardened PO fulfillment rule: PO is only fulfilled if associated invoice is PAID
    // and invoice total satisfies the full PO value commitment (>= 99% to account for currency rounding)
    const fulfilledPOsCount = purchaseOrders.filter((po) => {
      if (!po.invoice || po.invoice.status !== 'PAID') return false;
      const poTotal = Number(po.grandTotal ?? po.amount ?? 0);
      const invTotal = Number(po.invoice.grandTotal ?? 0);
      return poTotal > 0 ? invTotal >= poTotal * 0.99 : true;
    }).length;

    const poFulfillmentRate =
      totalEligiblePOsCount > 0
        ? Number(((fulfilledPOsCount / totalEligiblePOsCount) * 100).toFixed(1))
        : 0.0;

    // 3.4 Pending Invoices
    const pendingInvoices = invoices.filter((inv) => inv.status === 'PENDING_PAYMENT').length;

    // 3.5 Overdue Invoices: Unpaid invoices whose dueDate < now()
    const now = new Date();
    const overdueInvoices = invoices.filter(
      (inv) => inv.status === 'PENDING_PAYMENT' && inv.dueDate && new Date(inv.dueDate) < now
    ).length;

    const kpis: ReportKpiMetrics = {
      totalSpend,
      formattedTotalSpend,
      currency: 'INR',
      activeVendors: activeVendorsCount,
      poFulfillmentRate,
      fulfilledPOsCount,
      totalEligiblePOsCount,
      pendingInvoices,
      overdueInvoices,
    };

    // 4. Monthly Spend Trend Chart
    const monthlySpendTrend = this.calculateMonthlyTrend(paidInvoices, purchaseOrders, startDate, endDate);

    // 5. Spend by Category Chart
    const spendByCategory = this.calculateSpendByCategory(paidInvoices, totalSpend);

    // 6. Top Vendors by Paid Spend Table / Chart
    const topVendors = this.calculateTopVendors(paidInvoices);

    // 7. PO Status Distribution
    const poStatusDistribution = this.calculatePoStatusDistribution(purchaseOrders);

    // 8. Invoice Status Distribution
    const invoiceStatusDistribution = this.calculateInvoiceStatusDistribution(invoices);

    // 9. Vendor Performance Metrics
    const vendorPerformance = await this.calculateVendorPerformance(vendorId, startDate, endDate);

    return {
      period: periodKey,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      currency: 'INR',
      kpis,
      monthlySpendTrend,
      spendByCategory,
      topVendors,
      poStatusDistribution,
      invoiceStatusDistribution,
      vendorPerformance,
    };
  }

  /**
   * Generates RFC 4180 compliant CSV export with OWASP formula injection protection
   */
  public async exportCsv(
    currentUser: { id: string; role: Role },
    options: ReportFilterOptions = {}
  ): Promise<{ filename: string; csvContent: string }> {
    const { startDate, endDate, periodKey } = parseReportDateRange(
      options.period,
      options.startDate,
      options.endDate
    );

    let vendorId: string | undefined;
    if (currentUser.role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: currentUser.id },
      });
      if (!vendor) {
        return {
          filename: `vendorbridge_report_${periodKey}_empty.csv`,
          csvContent: 'Invoice Number,PO Number,Vendor Name,Vendor GSTIN,Category,Subtotal (INR),Tax Rate (%),Tax Amount (INR),Grand Total (INR),Status,Due Date,Paid Date,Created Date\r\n',
        };
      }
      vendorId = vendor.id;
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(vendorId ? { vendorId } : {}),
      },
      include: {
        vendor: true,
        purchaseOrder: {
          include: {
            rfq: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Invoice Number',
      'PO Number',
      'Vendor Name',
      'Vendor GSTIN',
      'Category',
      'Subtotal (INR)',
      'Tax Rate (%)',
      'Tax Amount (INR)',
      'Grand Total (INR)',
      'Status',
      'Due Date',
      'Paid Date',
      'Created Date',
    ];

    const lines: string[] = [headers.map(sanitizeCsvCell).join(',')];

    for (const inv of invoices) {
      const category = inv.purchaseOrder?.rfq?.category || inv.vendor?.category || 'General Procurement';
      const subtotal = Number(inv.subtotalAmount).toFixed(2);
      const taxRate = Number(inv.taxRate).toFixed(2);
      const taxAmount = Number(inv.taxAmount).toFixed(2);
      const grandTotal = Number(inv.grandTotal).toFixed(2);
      const dueDate = inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : 'N/A';
      const paidDate = inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : 'N/A';
      const createdDate = new Date(inv.createdAt).toISOString().split('T')[0];

      const row = [
        inv.invoiceNumber,
        inv.purchaseOrder?.poNumber || 'N/A',
        inv.vendor?.name || 'Unknown Supplier',
        inv.vendor?.gstin || 'N/A',
        category,
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        inv.status,
        dueDate,
        paidDate,
        createdDate,
      ];

      lines.push(row.map(sanitizeCsvCell).join(','));
    }

    const dateSlug = new Date().toISOString().split('T')[0];
    const filename = `vendorbridge_procurement_report_${periodKey}_${dateSlug}.csv`;
    const csvContent = lines.join('\r\n') + '\r\n';

    return { filename, csvContent };
  }

  // --- Helper Calculators ---

  private calculateMonthlyTrend(
    paidInvoices: any[],
    purchaseOrders: any[],
    startDate: Date,
    endDate: Date
  ): MonthlySpendTrendItem[] {
    const monthMap = new Map<string, { spend: number; poAmount: number; invoiceCount: number }>();

    // Generate month slots from start to end (up to 12)
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { spend: 0, poAmount: 0, invoiceCount: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const inv of paidInvoices) {
      const d = inv.paidAt ? new Date(inv.paidAt) : new Date(inv.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) {
        entry.spend += Number(inv.grandTotal);
        entry.invoiceCount += 1;
      }
    }

    for (const po of purchaseOrders) {
      const d = new Date(po.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) {
        entry.poAmount += Number(po.grandTotal ?? po.amount ?? 0);
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend: MonthlySpendTrendItem[] = [];

    for (const [key, val] of monthMap.entries()) {
      const [year, monthStr] = key.split('-');
      const mIdx = parseInt(monthStr, 10) - 1;
      trend.push({
        month: key,
        monthLabel: `${monthNames[mIdx]} ${year}`,
        spend: Number(val.spend.toFixed(2)),
        poAmount: Number(val.poAmount.toFixed(2)),
        invoiceCount: val.invoiceCount,
      });
    }

    return trend;
  }

  private calculateSpendByCategory(paidInvoices: any[], totalSpend: number): CategorySpendItem[] {
    if (paidInvoices.length === 0 || totalSpend === 0) {
      return [];
    }

    const catMap = new Map<string, number>();

    for (const inv of paidInvoices) {
      const cat = inv.purchaseOrder?.rfq?.category || inv.vendor?.category || 'General Procurement';
      const existing = catMap.get(cat) || 0;
      catMap.set(cat, existing + Number(inv.grandTotal));
    }

    const result: CategorySpendItem[] = [];
    for (const [category, amount] of catMap.entries()) {
      const percentage = totalSpend > 0 ? Number(((amount / totalSpend) * 100).toFixed(1)) : 0;
      result.push({
        category,
        amount: Number(amount.toFixed(2)),
        percentage,
      });
    }

    return result.sort((a, b) => b.amount - a.amount);
  }

  private calculateTopVendors(paidInvoices: any[]): TopVendorSpendItem[] {
    const vMap = new Map<string, { vendorName: string; paidAmount: number; invoiceCount: number; poCount: Set<string> }>();

    for (const inv of paidInvoices) {
      const vId = inv.vendorId;
      const vName = inv.vendor?.name || 'Unknown Supplier';

      if (!vMap.has(vId)) {
        vMap.set(vId, { vendorName: vName, paidAmount: 0, invoiceCount: 0, poCount: new Set() });
      }

      const rec = vMap.get(vId)!;
      rec.paidAmount += Number(inv.grandTotal);
      rec.invoiceCount += 1;
      if (inv.purchaseOrderId) {
        rec.poCount.add(inv.purchaseOrderId);
      }
    }

    const result: TopVendorSpendItem[] = [];
    for (const [vendorId, val] of vMap.entries()) {
      result.push({
        vendorId,
        vendorName: val.vendorName,
        paidAmount: Number(val.paidAmount.toFixed(2)),
        invoiceCount: val.invoiceCount,
        poCount: val.poCount.size,
      });
    }

    return result.sort((a, b) => b.paidAmount - a.paidAmount).slice(0, 5);
  }

  private calculatePoStatusDistribution(purchaseOrders: any[]): StatusDistributionItem[] {
    const total = purchaseOrders.length;
    const counts: Record<string, number> = {
      APPROVED: 0,
      ISSUED: 0,
      PENDING: 0,
      DRAFT: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };

    for (const po of purchaseOrders) {
      if (counts[po.status] !== undefined) {
        counts[po.status]++;
      } else {
        counts[po.status] = 1;
      }
    }

    const labels: Record<string, string> = {
      APPROVED: 'Approved',
      ISSUED: 'Issued to Supplier',
      PENDING: 'Pending Approval',
      DRAFT: 'Draft',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled',
    };

    return Object.entries(counts)
      .filter(([_, count]) => total === 0 || count > 0)
      .map(([status, count]) => ({
        status,
        label: labels[status] || status,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      }));
  }

  private calculateInvoiceStatusDistribution(invoices: any[]): StatusDistributionItem[] {
    const total = invoices.length;
    const counts: Record<string, number> = {
      PAID: 0,
      PENDING_PAYMENT: 0,
      CANCELLED: 0,
    };

    for (const inv of invoices) {
      if (counts[inv.status] !== undefined) {
        counts[inv.status]++;
      } else {
        counts[inv.status] = 1;
      }
    }

    const labels: Record<string, string> = {
      PAID: 'Paid & Settled',
      PENDING_PAYMENT: 'Pending Payment',
      CANCELLED: 'Cancelled / Void',
    };

    return Object.entries(counts).map(([status, count]) => ({
      status,
      label: labels[status] || status,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }));
  }

  private async calculateVendorPerformance(
    vendorId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<VendorPerformanceMetrics> {
    // RFQ Response Rate: Quoted invitations / total invitations
    const invitationWhere: Prisma.RfqVendorInvitationWhereInput = {
      invitedAt: { gte: startDate, lte: endDate },
      ...(vendorId ? { vendorId } : {}),
    };

    const totalInvitations = await prisma.rfqVendorInvitation.count({ where: invitationWhere });
    const quotedInvitations = await prisma.rfqVendorInvitation.count({
      where: {
        ...invitationWhere,
        status: 'QUOTED',
      },
    });

    const rfqResponseRate =
      totalInvitations > 0 ? Number(((quotedInvitations / totalInvitations) * 100).toFixed(1)) : 0.0;

    // Quotation Award Rate: Approved/Selected / Total submitted
    const quoteWhere: Prisma.QuotationWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'DRAFT' },
      ...(vendorId ? { vendorId } : {}),
    };

    const totalSubmittedQuotes = await prisma.quotation.count({ where: quoteWhere });
    const awardedQuotes = await prisma.quotation.count({
      where: {
        ...quoteWhere,
        status: { in: ['SELECTED', 'APPROVED'] },
      },
    });

    const quotationAwardRate =
      totalSubmittedQuotes > 0
        ? Number(((awardedQuotes / totalSubmittedQuotes) * 100).toFixed(1))
        : 0.0;

    // Invoice Settlement Rate: Paid / Total
    const invWhere: Prisma.InvoiceWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      ...(vendorId ? { vendorId } : {}),
    };

    const totalInvoices = await prisma.invoice.count({ where: invWhere });
    const paidInvoices = await prisma.invoice.count({
      where: {
        ...invWhere,
        status: 'PAID',
      },
    });

    const invoiceSettlementRate =
      totalInvoices > 0 ? Number(((paidInvoices / totalInvoices) * 100).toFixed(1)) : 0.0;

    // Average Delivery Lead Days from awarded quotes
    const awardedQuotesData = await prisma.quotation.findMany({
      where: {
        ...quoteWhere,
        status: { in: ['SELECTED', 'APPROVED'] },
      },
      select: { deliveryDays: true },
    });

    let avgDeliveryLeadDays = 0;
    if (awardedQuotesData.length > 0) {
      const sumDays = awardedQuotesData.reduce((s, q) => s + (q.deliveryDays || 0), 0);
      avgDeliveryLeadDays = Number((sumDays / awardedQuotesData.length).toFixed(1));
    }

    return {
      rfqResponseRate,
      quotationAwardRate,
      invoiceSettlementRate,
      avgDeliveryLeadDays,
      limitationNotice:
        'Physical warehouse dock delivery scans and transit carrier tracking are not captured in the current schema; performance scorecard metrics represent contractual RFP response, quotation win velocity, and payment settlement rates.',
    };
  }

  private getEmptyOverview(
    period: string,
    startDate: Date,
    endDate: Date
  ): ReportsOverviewResponse {
    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      currency: 'INR',
      kpis: {
        totalSpend: 0,
        formattedTotalSpend: '₹0.00',
        currency: 'INR',
        activeVendors: 0,
        poFulfillmentRate: 0.0,
        fulfilledPOsCount: 0,
        totalEligiblePOsCount: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
      },
      monthlySpendTrend: [],
      spendByCategory: [],
      topVendors: [],
      poStatusDistribution: [],
      invoiceStatusDistribution: [],
      vendorPerformance: {
        rfqResponseRate: 0.0,
        quotationAwardRate: 0.0,
        invoiceSettlementRate: 0.0,
        avgDeliveryLeadDays: 0,
        limitationNotice:
          'No vendor profile connected to this user account or no transactions found in the reporting period.',
      },
    };
  }
}

export const reportsService = new ReportsService();
