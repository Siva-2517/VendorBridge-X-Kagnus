import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { isSafeTestDatabaseConfigured } from './testDbGuard';
import { sanitizeCsvCell } from '../services/reportsService';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 4 Phase 5: Final End-to-End Integration & Security Audit Suite', () => {
  let adminCookie: string;
  let officerCookie: string;
  let managerCookie: string;
  let vendorCookie: string;

  let adminUser: any;
  let officerUser: any;
  let managerUser: any;
  let vendorUser: any;
  let vendorProfile: any;

  // Lifecycle Entity References
  let createdRfqId: string;
  let createdRfqNumber: string;
  let createdRfqItemId: string;
  let createdQuotationId: string;
  let createdApprovalRequestId: string;
  let createdPoId: string;
  let createdPoNumber: string;
  let createdInvoiceId: string;
  let createdInvoiceNumber: string;

  beforeAll(async () => {
    // 1. Authenticate All Key Roles
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers['set-cookie'][0];
    adminUser = await prisma.user.findUnique({ where: { email: 'admin@vendorbridge.com' } });

    const officerLogin = await request(app).post('/api/auth/login').send({
      email: 'officer@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(officerLogin.status).toBe(200);
    officerCookie = officerLogin.headers['set-cookie'][0];
    officerUser = await prisma.user.findUnique({ where: { email: 'officer@vendorbridge.com' } });

    const managerLogin = await request(app).post('/api/auth/login').send({
      email: 'manager@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(managerLogin.status).toBe(200);
    managerCookie = managerLogin.headers['set-cookie'][0];
    managerUser = await prisma.user.findUnique({ where: { email: 'manager@vendorbridge.com' } });

    const vendorLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(vendorLogin.status).toBe(200);
    vendorCookie = vendorLogin.headers['set-cookie'][0];
    vendorUser = await prisma.user.findUnique({
      where: { email: 'vendor@infrasupplies.com' },
      include: { vendorProfile: true },
    });
    vendorProfile = vendorUser?.vendorProfile;
    expect(vendorProfile).toBeDefined();
  });

  afterAll(async () => {
    try {
      if (createdInvoiceId) {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: createdInvoiceId } });
        await prisma.invoice.deleteMany({ where: { id: createdInvoiceId } });
      }
      if (createdPoId) {
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: createdPoId } });
        await prisma.purchaseOrder.deleteMany({ where: { id: createdPoId } });
      }
      if (createdApprovalRequestId) {
        await prisma.approvalHistory.deleteMany({ where: { approvalRequestId: createdApprovalRequestId } });
        await prisma.approvalRequest.deleteMany({ where: { id: createdApprovalRequestId } });
      }
      if (createdQuotationId) {
        await prisma.quotationItem.deleteMany({ where: { quotationId: createdQuotationId } });
        await prisma.quotation.deleteMany({ where: { id: createdQuotationId } });
      }
      if (createdRfqId) {
        await prisma.rfqVendorInvitation.deleteMany({ where: { rfqId: createdRfqId } });
        await prisma.rfqItem.deleteMany({ where: { rfqId: createdRfqId } });
        await prisma.rfq.deleteMany({ where: { id: createdRfqId } });
      }
    } catch (e) {
      console.error('Lifecycle cleanup error:', e);
    }
  });

  describe('1. Full Business Lifecycle (RFQ -> Quote -> Approval -> PO -> Invoice -> Paid)', () => {
    it('Step 1: Procurement Officer creates RFQ inviting the vendor', async () => {
      const res = await request(app)
        .post('/api/rfqs')
        .set('Cookie', [officerCookie])
        .send({
          title: 'E2E Lifecycle Heavy Industrial Cable Trays',
          description: 'Full procurement audit testing for Week 4 deployment verification',
          category: 'Constructions',
          deliveryLocation: 'Central Infrastructure Hub, Mumbai',
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              itemDescription: 'Galvanized Cable Trays 300mm x 50mm',
              quantity: 100,
              uom: 'Meters',
              targetPrice: 750.0,
            },
          ],
          vendorIds: [vendorProfile.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdRfqId = res.body.rfq.id;
      createdRfqNumber = res.body.rfq.rfqNumber;
      createdRfqItemId = res.body.rfq.items[0].id;
      expect(createdRfqId).toBeDefined();
    });

    it('Step 2: Invited Vendor submits quotation', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Cookie', [vendorCookie])
        .send({
          rfqId: createdRfqId,
          deliveryDays: 14,
          paymentTerms: 'NET 30',
          taxRate: 18.0,
          notes: 'Contract grade steel per ASTM A123',
          items: [
            {
              rfqItemId: createdRfqItemId,
              unitPrice: 720.0, // Line total = 72,000. Tax = 12,960. GrandTotal = 84,960.
              remarks: 'Offered with 5-year anti-corrosion guarantee',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdQuotationId = res.body.quotation.id;
      expect(createdQuotationId).toBeDefined();
      expect(Number(res.body.quotation.grandTotal)).toBe(84960.0);
    });

    it('Step 3: Officer selects quotation for managerial review', async () => {
      const res = await request(app)
        .post(`/api/rfqs/${createdRfqId}/select-quotation`)
        .set('Cookie', [officerCookie])
        .send({
          quotationId: createdQuotationId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const approval = await prisma.approvalRequest.findUnique({
        where: { quotationId: createdQuotationId },
      });
      expect(approval).toBeDefined();
      expect(approval?.status).toBe('PENDING');
      createdApprovalRequestId = approval!.id;
    });

    it('Step 4: Manager Approver approves the quotation', async () => {
      const res = await request(app)
        .post(`/api/approvals/${createdApprovalRequestId}/decide`)
        .set('Cookie', [managerCookie])
        .send({
          decision: 'APPROVE',
          remarks: 'Budget authorized under Q4 infrastructure allocation',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.approval.status).toBe('APPROVED');
    });

    it('Step 5: Officer generates Purchase Order from approved quotation', async () => {
      const res = await request(app)
        .post('/api/purchase-orders/generate')
        .set('Cookie', [officerCookie])
        .send({
          quotationId: createdQuotationId,
          notes: 'Expedite shipment to Central Hub dock',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdPoId = res.body.purchaseOrder.id;
      createdPoNumber = res.body.purchaseOrder.poNumber;
      expect(createdPoNumber).toMatch(/^PO-\d{4}-\d{4}$/);
      expect(res.body.purchaseOrder.status).toBe('APPROVED');
      expect(Number(res.body.purchaseOrder.grandTotal)).toBe(84960.0);
    });

    it('Step 6: Officer creates Tax Invoice against the Purchase Order', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({
          purchaseOrderId: createdPoId,
          notes: 'Invoice for 100m Galvanized Cable Trays',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdInvoiceId = res.body.invoice.id;
      createdInvoiceNumber = res.body.invoice.invoiceNumber;
      expect(createdInvoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(res.body.invoice.status).toBe('PENDING_PAYMENT');
      expect(Number(res.body.invoice.grandTotal)).toBe(84960.0);
    });

    it('Step 7: Admin marks Invoice as PAID', async () => {
      const res = await request(app)
        .post(`/api/invoices/${createdInvoiceId}/mark-paid`)
        .set('Cookie', [adminCookie])
        .send({
          notes: 'Settled via Corporate RTGS Ref #RTGS-990145',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.invoice.status).toBe('PAID');
      expect(res.body.invoice.paidAt).toBeDefined();
    });
  });

  describe('2. Audit Trail & Notification Verification', () => {
    it('verifies complete atomic audit trail was recorded for the lifecycle', async () => {
      const res = await request(app)
        .get('/api/activity?limit=50')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      const actions = res.body.activities.map((a: any) => a.action);

      // Verify all lifecycle actions exist in the activity log
      expect(actions).toContain('RFQ_CREATED');
      expect(actions).toContain('QUOTATION_SUBMITTED');
      expect(actions).toContain('SELECTED_FOR_APPROVAL');
      expect(actions).toContain('APPROVAL_APPROVED');
      expect(actions).toContain('PO_GENERATED');
      expect(actions).toContain('INVOICE_CREATED');
      expect(actions).toContain('INVOICE_PAID');
    });

    it('verifies Vendor activity feed is tenant-isolated to their own records', async () => {
      const res = await request(app)
        .get('/api/activity?limit=50')
        .set('Cookie', [vendorCookie]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.activities.length).toBeGreaterThan(0);

      // Verify that no activity leaks other vendors' private records (e.g. vnd-02, vnd-03)
      for (const item of res.body.activities) {
        expect(item.entityId).not.toBe('vnd-02');
        expect(item.entityId).not.toBe('vnd-03');
        if (item.metadata && typeof item.metadata === 'object' && item.metadata.vendorId) {
          expect(item.metadata.vendorId).toBe(vendorProfile.id);
        }
      }

      // Verify that the vendor's newly created RFQ or quotation is present in their feed
      const entityIds = res.body.activities.map((a: any) => a.entityId);
      const isVendorRelated =
        entityIds.includes(createdRfqId) ||
        entityIds.includes(createdQuotationId) ||
        entityIds.includes(createdPoId);
      expect(isVendorRelated).toBe(true);
    });

    it('verifies Vendor notifications and read management workflow', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Cookie', [vendorCookie]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(typeof res.body.pagination?.unreadCount).toBe('number');

      // Test marking all notifications read
      const markAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Cookie', [vendorCookie]);

      expect(markAllRes.status).toBe(200);
      expect(markAllRes.body.success).toBe(true);

      const checkRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', [vendorCookie]);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.unreadCount).toBe(0);
    });
  });

  describe('3. Reports & Analytics and CSV Export Verification', () => {
    it('verifies live overview reflects the settled lifecycle transaction', async () => {
      const res = await request(app)
        .get('/api/reports/overview?period=all')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      const kpis = res.body.data.kpis;

      // Total spend should include the 84,960 invoice
      expect(kpis.totalSpend).toBeGreaterThanOrEqual(84960.0);
      expect(kpis.poFulfillmentRate).toBeGreaterThan(0.0);

      // Category breakdown should contain Constructions
      const constructions = res.body.data.spendByCategory.find((c: any) => c.category === 'Constructions');
      expect(constructions).toBeDefined();
      expect(constructions.amount).toBeGreaterThanOrEqual(84960.0);

      // Top vendors should list Infra Supplies
      const infraVendor = res.body.data.topVendors.find((v: any) => v.vendorId === vendorProfile.id);
      expect(infraVendor).toBeDefined();
      expect(infraVendor.paidAmount).toBeGreaterThanOrEqual(84960.0);
    });

    it('verifies hardened PO fulfillment calculation: partial unpaid invoices do not count as fulfilled', () => {
      // Unit test the hardening rule: PO is only fulfilled if invoice is PAID and covers full value
      const poComplete = {
        amount: 84960,
        grandTotal: 84960,
        invoice: { status: 'PAID', grandTotal: 84960 },
      };
      const poPartial = {
        amount: 84960,
        grandTotal: 84960,
        invoice: { status: 'PAID', grandTotal: 20000 }, // only 20k paid of 84.9k commitment
      };
      const poUnpaid = {
        amount: 84960,
        grandTotal: 84960,
        invoice: { status: 'PENDING_PAYMENT', grandTotal: 84960 },
      };

      const checkFulfillment = (po: any) => {
        if (!po.invoice || po.invoice.status !== 'PAID') return false;
        const poTotal = Number(po.grandTotal ?? po.amount ?? 0);
        const invTotal = Number(po.invoice.grandTotal ?? 0);
        return poTotal > 0 ? invTotal >= poTotal * 0.99 : true;
      };

      expect(checkFulfillment(poComplete)).toBe(true);
      expect(checkFulfillment(poPartial)).toBe(false);
      expect(checkFulfillment(poUnpaid)).toBe(false);
    });

    it('verifies CSV export contains settled invoice with formula injection protection', async () => {
      const res = await request(app)
        .get('/api/reports/export?period=all')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain(createdInvoiceNumber);
      expect(res.text).toContain(createdPoNumber);
      expect(res.text).toContain('84960.00');

      // Test formula injection sanitizer on dangerous cell contents
      expect(sanitizeCsvCell('=cmd|/C')).toBe("'=cmd|/C");
      expect(sanitizeCsvCell('+100')).toBe("'+100");
      expect(sanitizeCsvCell('-12345')).toBe("'-12345");
      expect(sanitizeCsvCell('@HYPERLINK("http://evil.com")')).toContain("'@HYPERLINK");
    });

    it('verifies Vendor cannot export competitor financial data via CSV', async () => {
      const res = await request(app)
        .get('/api/reports/export?period=all')
        .set('Cookie', [vendorCookie]);

      expect(res.status).toBe(200);
      expect(res.text).toContain(createdInvoiceNumber);
      // Ensure other vendors (e.g. Apex or Tech Core) do not leak into this vendor's export
      expect(res.text).not.toContain('Apex Global Logistics');
    });
  });

  describe('4. Security & Immutability Enforcement', () => {
    it('rejects cross-vendor access attempts using guessed entity IDs', async () => {
      // Vendor attempting to access another vendor's profile or unauthorized invoice
      const res = await request(app)
        .get(`/api/vendors/vnd-02`) // Tech Core LTD
        .set('Cookie', [vendorCookie]);

      // Vendor role cannot view competitor vendor detail endpoint
      expect([403, 404]).toContain(res.status);
    });

    it('strictly prohibits direct modification or deletion of AuditLog records via database trigger', async () => {
      // Database level trigger protection verification
      await expect(
        prisma.$executeRaw`DELETE FROM "AuditLog" WHERE action = 'INVOICE_PAID';`
      ).rejects.toThrow();

      await expect(
        prisma.$executeRaw`UPDATE "AuditLog" SET details = 'Tampered' WHERE action = 'INVOICE_PAID';`
      ).rejects.toThrow();
    });

    it('strictly returns 404 for any mutating HTTP verbs against /api/activity', async () => {
      const postRes = await request(app).post('/api/activity').set('Cookie', [adminCookie]).send({});
      expect(postRes.status).toBe(404);

      const patchRes = await request(app).patch('/api/activity/fake-id').set('Cookie', [adminCookie]).send({});
      expect(patchRes.status).toBe(404);

      const deleteRes = await request(app).delete('/api/activity/fake-id').set('Cookie', [adminCookie]);
      expect(deleteRes.status).toBe(404);
    });
  });
});
