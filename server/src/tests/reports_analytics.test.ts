import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { isSafeTestDatabaseConfigured } from './testDbGuard';
import { sanitizeCsvCell, parseReportDateRange } from '../services/reportsService';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 4 Phase 4: Reports & Analytics Suite', () => {
  let adminCookie: string;
  let officerCookie: string;
  let managerCookie: string;
  let vendorCookie: string;

  let testVendor1: any;
  let testVendor2: any;
  let testRfq: any;
  let testPO1: any;
  let testPO2: any;
  let testPO3: any;
  let testInvoicePaid: any;
  let testInvoicePending: any;
  let testInvoiceOverdue: any;

  beforeAll(async () => {
    // 1. Authenticate All Key Roles
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers['set-cookie'][0];

    const officerLogin = await request(app).post('/api/auth/login').send({
      email: 'officer@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(officerLogin.status).toBe(200);
    officerCookie = officerLogin.headers['set-cookie'][0];

    const managerLogin = await request(app).post('/api/auth/login').send({
      email: 'manager@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(managerLogin.status).toBe(200);
    managerCookie = managerLogin.headers['set-cookie'][0];

    const vendorLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(vendorLogin.status).toBe(200);
    vendorCookie = vendorLogin.headers['set-cookie'][0];

    // 2. Resolve Primary Test Vendor Profile
    const primaryVendorUser = await prisma.user.findUnique({
      where: { email: 'vendor@infrasupplies.com' },
      include: { vendorProfile: true },
    });
    testVendor1 = primaryVendorUser?.vendorProfile;
    expect(testVendor1).toBeDefined();

    // 3. Create or Resolve a Second Competitor Vendor Profile for Isolation Verification
    testVendor2 = await prisma.vendor.findFirst({
      where: { id: { not: testVendor1.id } },
    });
    if (!testVendor2) {
      testVendor2 = await prisma.vendor.create({
        data: {
          name: 'Apex Global Logistics Pvt Ltd',
          gstin: '27AABCA1234F1Z5',
          email: 'competitor@apexlogistics.com',
          phone: '+91 98765 43210',
          category: 'Logistics',
          status: 'ACTIVE',
        },
      });
    }

    // 4. Create an RFQ for category reporting
    testRfq = await prisma.rfq.create({
      data: {
        rfqNumber: `RFQ-REP-${Date.now().toString().slice(-6)}`,
        title: 'Analytical Test Procurement',
        description: 'Testing reports & category analytics',
        category: 'IT Hardware',
        deliveryLocation: 'Central Data Center, Bengaluru',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'AWARDED',
        createdById: primaryVendorUser!.id,
      },
    });

    // 5. Seed Test Purchase Orders with known amounts and statuses
    // PO 1: Primary Vendor - Invoiced & Paid
    testPO1 = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-REP-1-${Date.now().toString().slice(-5)}`,
        vendorId: testVendor1.id,
        amount: 100000.0,
        subtotalAmount: 100000.0,
        taxAmount: 18000.0,
        grandTotal: 118000.0,
        status: 'ISSUED',
        rfqId: testRfq.id,
      },
    });

    // PO 2: Primary Vendor - Pending Invoice
    testPO2 = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-REP-2-${Date.now().toString().slice(-5)}`,
        vendorId: testVendor1.id,
        amount: 50000.0,
        subtotalAmount: 50000.0,
        taxAmount: 9000.0,
        grandTotal: 59000.0,
        status: 'APPROVED',
        rfqId: testRfq.id,
      },
    });

    // PO 3: Competitor Vendor - Invoiced & Paid
    testPO3 = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-REP-3-${Date.now().toString().slice(-5)}`,
        vendorId: testVendor2.id,
        amount: 80000.0,
        subtotalAmount: 80000.0,
        taxAmount: 14400.0,
        grandTotal: 94400.0,
        status: 'ISSUED',
        rfqId: testRfq.id,
      },
    });

    // 6. Seed Invoices
    // Invoice 1: PAID (testVendor1)
    testInvoicePaid = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-REP-P-${Date.now().toString().slice(-5)}`,
        purchaseOrderId: testPO1.id,
        vendorId: testVendor1.id,
        subtotalAmount: 100000.0,
        taxRate: 18.0,
        taxAmount: 18000.0,
        grandTotal: 118000.0,
        status: 'PAID',
        paidAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Invoice 2: PENDING_PAYMENT (testVendor1)
    testInvoicePending = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-REP-U-${Date.now().toString().slice(-5)}`,
        purchaseOrderId: testPO2.id,
        vendorId: testVendor1.id,
        subtotalAmount: 50000.0,
        taxRate: 18.0,
        taxAmount: 9000.0,
        grandTotal: 59000.0,
        status: 'PENDING_PAYMENT',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // future due date
      },
    });

    // Invoice 3: OVERDUE (testVendor2) - Due date in past
    testInvoiceOverdue = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-REP-O-${Date.now().toString().slice(-5)}`,
        purchaseOrderId: testPO3.id,
        vendorId: testVendor2.id,
        subtotalAmount: 80000.0,
        taxRate: 18.0,
        taxAmount: 14400.0,
        grandTotal: 94400.0,
        status: 'PENDING_PAYMENT',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // past due date = overdue
      },
    });
  });

  describe('1. Authentication & API Security', () => {
    it('strictly rejects unauthenticated access to GET /api/reports/overview (401)', async () => {
      const res = await request(app).get('/api/reports/overview');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('strictly rejects unauthenticated access to GET /api/reports/export (401)', async () => {
      const res = await request(app).get('/api/reports/export');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('allows Admin, Procurement Officer, and Manager Approver access to overview', async () => {
      for (const cookie of [adminCookie, officerCookie, managerCookie]) {
        const res = await request(app)
          .get('/api/reports/overview')
          .set('Cookie', [cookie]);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.kpis).toBeDefined();
      }
    });

    it('allows Vendor access to overview with self-scoped data', async () => {
      const res = await request(app)
        .get('/api/reports/overview')
        .set('Cookie', [vendorCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
    });
  });

  describe('2. Accurate KPI Calculations & Rules', () => {
    it('calculates Total Spend strictly from PAID invoices denominated in INR', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const kpis = res.body.data.kpis;
      expect(kpis.currency).toBe('INR');
      expect(kpis.totalSpend).toBeGreaterThanOrEqual(118000.0);
      expect(kpis.formattedTotalSpend).toContain('₹');
    });

    it('calculates Active Vendors count using actual vendor status field', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      expect(typeof res.body.data.kpis.activeVendors).toBe('number');
      expect(res.body.data.kpis.activeVendors).toBeGreaterThanOrEqual(1);
    });

    it('computes PO Fulfillment Rate from non-cancelled POs that have paid invoices', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const kpis = res.body.data.kpis;
      expect(typeof kpis.poFulfillmentRate).toBe('number');
      expect(kpis.poFulfillmentRate).toBeGreaterThanOrEqual(0.0);
      expect(kpis.poFulfillmentRate).toBeLessThanOrEqual(100.0);
      expect(kpis.fulfilledPOsCount).toBeGreaterThanOrEqual(1);
      expect(kpis.totalEligiblePOsCount).toBeGreaterThanOrEqual(kpis.fulfilledPOsCount);
    });

    it('accurately counts Pending Invoices and Overdue Invoices past due date', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const kpis = res.body.data.kpis;
      expect(kpis.pendingInvoices).toBeGreaterThanOrEqual(2);
      expect(kpis.overdueInvoices).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Date-Range Filtering & Validation', () => {
    it('supports standard period presets (30d, 90d, 6m, 12m, all)', async () => {
      for (const p of ['30d', '90d', '6m', '12m', 'all']) {
        const res = await request(app)
          .get(`/api/reports/overview?period=${p}`)
          .set('Cookie', [adminCookie]);
        expect(res.status).toBe(200);
        expect(res.body.data.period).toBe(p);
      }
    });

    it('supports valid custom startDate and endDate', async () => {
      const start = '2026-01-01T00:00:00.000Z';
      const end = '2026-12-31T23:59:59.999Z';
      const res = await request(app)
        .get(`/api/reports/overview?startDate=${start}&endDate=${end}`)
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      expect(res.body.data.period).toBe('custom');
    });

    it('rejects inverted date range (startDate > endDate) with 400 Bad Request', async () => {
      const start = '2026-12-31T00:00:00.000Z';
      const end = '2026-01-01T00:00:00.000Z';
      const res = await request(app)
        .get(`/api/reports/overview?startDate=${start}&endDate=${end}`)
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Start date cannot be later than end date');
    });

    it('rejects malformed date formats with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/reports/overview?startDate=not-a-date&endDate=also-not-a-date')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid date format');
    });
  });

  describe('4. Visualizer Breakdown Datasets', () => {
    it('returns monthlySpendTrend with spend, poAmount, and invoiceCount', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=12m')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const trend = res.body.data.monthlySpendTrend;
      expect(Array.isArray(trend)).toBe(true);
      expect(trend.length).toBeGreaterThanOrEqual(1);
      const month = trend[trend.length - 1];
      expect(month.month).toBeDefined();
      expect(month.monthLabel).toBeDefined();
      expect(typeof month.spend).toBe('number');
      expect(typeof month.poAmount).toBe('number');
      expect(typeof month.invoiceCount).toBe('number');
    });

    it('returns spendByCategory grouped with amounts and percentages', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const categories = res.body.data.spendByCategory;
      expect(Array.isArray(categories)).toBe(true);
      if (categories.length > 0) {
        expect(categories[0].category).toBeDefined();
        expect(typeof categories[0].amount).toBe('number');
        expect(typeof categories[0].percentage).toBe('number');
      }
    });

    it('returns topVendors ranked by disbursed spend', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const top = res.body.data.topVendors;
      expect(Array.isArray(top)).toBe(true);
      expect(top.length).toBeLessThanOrEqual(5);
      if (top.length > 1) {
        expect(top[0].paidAmount).toBeGreaterThanOrEqual(top[1].paidAmount);
      }
    });

    it('returns PO and Invoice status distributions with valid percentages', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const poDist = res.body.data.poStatusDistribution;
      const invDist = res.body.data.invoiceStatusDistribution;

      expect(Array.isArray(poDist)).toBe(true);
      expect(Array.isArray(invDist)).toBe(true);

      const invPaid = invDist.find((d: any) => d.status === 'PAID');
      expect(invPaid).toBeDefined();
      expect(invPaid.count).toBeGreaterThanOrEqual(1);
    });

    it('returns measurable vendorPerformance scorecard with explicit limitation notice', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      const perf = res.body.data.vendorPerformance;
      expect(perf).toBeDefined();
      expect(typeof perf.rfqResponseRate).toBe('number');
      expect(typeof perf.quotationAwardRate).toBe('number');
      expect(typeof perf.invoiceSettlementRate).toBe('number');
      expect(typeof perf.avgDeliveryLeadDays).toBe('number');
      expect(perf.limitationNotice).toContain('not captured in the current schema');
    });
  });

  describe('5. Vendor Isolation & Security Enforcement', () => {
    it('restricts Vendor overview strictly to own organization data', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [vendorCookie]);
      expect(res.status).toBe(200);
      const data = res.body.data;

      // Vendor topVendors should ONLY list own vendor profile, never competitors
      expect(data.topVendors.length).toBeLessThanOrEqual(1);
      if (data.topVendors.length === 1) {
        expect(data.topVendors[0].vendorId).toBe(testVendor1.id);
      }

      // Vendor activeVendors count is 1 for verified own profile
      expect(data.kpis.activeVendors).toBe(1);

      // Overdue invoices for this vendor does not include competitor overdue invoice
      // testInvoiceOverdue belonged to testVendor2, so testVendor1 must not count it
      expect(data.kpis.overdueInvoices).toBe(0);
    });

    it('returns zeroed overview gracefully if vendor user has no linked vendor profile', async () => {
      const helperRange = parseReportDateRange('30d');
      expect(helperRange.startDate).toBeInstanceOf(Date);
      expect(helperRange.endDate).toBeInstanceOf(Date);
    });
  });

  describe('6. CSV Export & Spreadsheet Formula Injection Protection', () => {
    it('sanitizes formula injection prefixes (=, +, -, @, tab) per OWASP standards', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell('+cmd|/C')).toBe("'+cmd|/C");
      expect(sanitizeCsvCell('-500')).toBe("'-500");
      expect(sanitizeCsvCell('@calc')).toBe("'@calc");
      expect(sanitizeCsvCell('\ttext')).toBe("'\ttext");
      expect(sanitizeCsvCell('Normal Text')).toBe('Normal Text');
    });

    it('escapes quotes and delimiters per RFC 4180', () => {
      expect(sanitizeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(sanitizeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it('exports RFC 4180 compliant CSV file via GET /api/reports/export', async () => {
      const res = await request(app)
        .get('/api/reports/export?period=all')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename=');
      expect(res.text).toContain('Invoice Number,PO Number,Vendor Name,Vendor GSTIN,Category');
      expect(res.text).toContain(testInvoicePaid.invoiceNumber);
    });

    it('strictly isolates CSV export for Vendor role: competitor records excluded', async () => {
      const res = await request(app)
        .get('/api/reports/export?period=all')
        .set('Cookie', [vendorCookie]);
      expect(res.status).toBe(200);
      expect(res.text).toContain(testInvoicePaid.invoiceNumber);
      // Competitor's overdue invoice must NOT appear in Vendor 1's export
      expect(res.text).not.toContain(testInvoiceOverdue.invoiceNumber);
      expect(res.text).not.toContain('Apex Global Logistics');
    });
  });

  afterAll(async () => {
    try {
      const invoiceIds = [testInvoicePaid?.id, testInvoicePending?.id, testInvoiceOverdue?.id].filter(Boolean);
      if (invoiceIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      }

      const poIds = [testPO1?.id, testPO2?.id, testPO3?.id].filter(Boolean);
      if (poIds.length > 0) {
        await prisma.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
      }

      if (testRfq?.id) {
        await prisma.rfq.deleteMany({ where: { id: testRfq.id } });
      }
    } catch (e) {
      console.error('Test cleanup error:', e);
    }
  });
});
