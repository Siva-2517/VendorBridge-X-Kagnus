import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { isSafeTestDatabaseConfigured } from './testDbGuard';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 2: RFQ & Quotation Management Test Suite [MUTATING - REQUIRES TEST_DATABASE_URL]', () => {
  let officerCookie: string;
  let adminCookie: string;
  let vendorCookie: string;
  let uninvitedVendorCookie: string;

  let testVendorId: string;
  let uninvitedVendorId: string;
  let testRfqId: string;
  let testRfqItemId: string;
  let testRfqItem2Id: string;
  let expiredRfqId: string;
  let submittedQuotationId: string;

  beforeAll(async () => {
    // Ensure cloud database connection pool is warm before tests run (handles Neon serverless wake-up)
    for (let i = 0; i < 4; i++) {
      try {
        await prisma.$connect();
        break;
      } catch (err) {
        if (i === 3) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // 1. Log in as Procurement Officer
    const officerLogin = await request(app).post('/api/auth/login').send({
      email: 'officer@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(officerLogin.status).toBe(200);
    const offCookies = officerLogin.headers['set-cookie'];
    officerCookie = Array.isArray(offCookies) ? offCookies[0] : (offCookies as unknown as string);

    // 2. Log in as Admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(adminLogin.status).toBe(200);
    const admCookies = adminLogin.headers['set-cookie'];
    adminCookie = Array.isArray(admCookies) ? admCookies[0] : (admCookies as unknown as string);

    // 3. Log in as Infra Supplies Vendor
    const vendorLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(vendorLogin.status).toBe(200);
    const venCookies = vendorLogin.headers['set-cookie'];
    vendorCookie = Array.isArray(venCookies) ? venCookies[0] : (venCookies as unknown as string);

    // 4. Ensure FastLog Vendor User exists (to test uninvited access)
    const uninvitedUser = await prisma.user.upsert({
      where: { email: 'dispatch@fastlog.com' },
      update: { role: 'VENDOR', isActive: true },
      create: {
        firstName: 'Suresh',
        lastName: 'Kumar',
        email: 'dispatch@fastlog.com',
        passwordHash: '$2a$10$XPcqRSxrux1eatlEt581WOUzJohZ3qwpGseShDCj4X7HgUfXNZpzy',
        role: 'VENDOR',
        isActive: true,
      },
    });

    const uninvitedLogin = await request(app).post('/api/auth/login').send({
      email: 'dispatch@fastlog.com',
      password: 'VendorBridge@2025',
    });
    expect(uninvitedLogin.status).toBe(200);
    const uninvCookies = uninvitedLogin.headers['set-cookie'];
    uninvitedVendorCookie = Array.isArray(uninvCookies) ? uninvCookies[0] : (uninvCookies as unknown as string);

    // Find vendor records
    const infraVendor = await prisma.vendor.findFirst({ where: { name: { contains: 'Infra' } } });
    const fastLogVendor = await prisma.vendor.findFirst({ where: { name: { contains: 'FastLog' } } });
    if (fastLogVendor) {
      await prisma.vendor.update({
        where: { id: fastLogVendor.id },
        data: { userId: uninvitedUser.id },
      });
      uninvitedVendorId = fastLogVendor.id;
    }
    testVendorId = infraVendor!.id;
  });

  describe('1. RFQ Creation & Identifier Guarantees', () => {
    it('should allow Procurement Officer to create an RFQ with sequential numbering and items', async () => {
      const futureDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/rfqs')
        .set('Cookie', officerCookie)
        .send({
          title: 'High-Density Server Racks and Power Distribution Units',
          description: 'Requisition for Phase 2 Data Center expansion racks with redundant PDUs',
          category: 'Hardware',
          deliveryLocation: 'Bengaluru Facility - DC 2',
          deadline: futureDeadline,
          status: 'OPEN',
          items: [
            {
              itemCode: 'RACK-42U-01',
              description: '42U 19-inch Server Rack with Perforated Doors',
              quantity: 10,
              uom: 'Units',
              targetPrice: 45000,
            },
            {
              itemCode: 'PDU-32A-01',
              description: 'Zero-U Monitored Rack PDU 32A Single Phase',
              quantity: 20,
              uom: 'Units',
              targetPrice: 12000,
            },
          ],
          vendorIds: [testVendorId], // Only invite Infra Supplies
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.rfq.rfqNumber).toMatch(/^RFQ-2026-\d{4}$/);
      expect(res.body.rfq.items.length).toBe(2);
      expect(res.body.rfq.invitations.length).toBe(1);

      testRfqId = res.body.rfq.id;
      testRfqItemId = res.body.rfq.items[0].id;
      testRfqItem2Id = res.body.rfq.items[1].id;
    });

    it('should forbid a Vendor from creating an RFQ', async () => {
      const res = await request(app)
        .post('/api/rfqs')
        .set('Cookie', vendorCookie)
        .send({
          title: 'Unauthorized Requisition',
          category: 'Hardware',
          deliveryLocation: 'Remote Site',
          deadline: new Date(Date.now() + 86400000).toISOString(),
          items: [{ itemCode: 'ITEM-01', description: 'Item 1', quantity: 1, uom: 'Units' }],
        });

      expect(res.status).toBe(403);
    });

    it('should reject RFQ creation with invalid deadline in the past', async () => {
      const pastDeadline = new Date(Date.now() - 3600000).toISOString();
      const res = await request(app)
        .post('/api/rfqs')
        .set('Cookie', officerCookie)
        .send({
          title: 'Expired Requisition',
          category: 'Hardware',
          deliveryLocation: 'HQ',
          deadline: pastDeadline,
          items: [{ itemCode: 'ITEM-01', description: 'Item 1', quantity: 1, uom: 'Units' }],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('2. Vendor Isolation & Security', () => {
    it('should allow invited Vendor to view assigned RFQ details', async () => {
      const res = await request(app)
        .get(`/api/rfqs/${testRfqId}`)
        .set('Cookie', vendorCookie);

      expect(res.status).toBe(200);
      expect(res.body.rfq.id).toBe(testRfqId);
      expect(res.body.rfq.items.length).toBe(2);
    });

    it('should reject uninvited Vendor from accessing the RFQ (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/rfqs/${testRfqId}`)
        .set('Cookie', uninvitedVendorCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not authorized to access this RFQ');
    });

    it('should prevent uninvited Vendor from submitting a quotation for that RFQ', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Cookie', uninvitedVendorCookie)
        .send({
          rfqId: testRfqId,
          taxRate: 18,
          paymentTerms: 'Net 30 Days',
          leadTimeDays: 14,
          status: 'SUBMITTED',
          items: [
            {
              rfqItemId: testRfqItemId,
              unitPrice: 40000,
              deliveryLeadDays: 10,
            },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('not assigned to this RFQ');
    });
  });

  describe('3. Quotation Submission, Exact Calculations & Draft Workflow', () => {
    it('should allow invited Vendor to save a draft quotation', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Cookie', vendorCookie)
        .send({
          rfqId: testRfqId,
          taxRate: 18,
          paymentTerms: 'Net 30 Days',
          leadTimeDays: 14,
          notes: 'Draft preliminary bid',
          status: 'DRAFT',
          items: [
            {
              rfqItemId: testRfqItemId,
              unitPrice: 42000,
              deliveryLeadDays: 10,
              notes: 'Rack unit tier 1',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.quotation.status).toBe('DRAFT');
      expect(res.body.quotation.quotationNumber).toMatch(/^QT-2026-\d{4}$/);

      submittedQuotationId = res.body.quotation.id;
    });

    it('should verify server-side decimal financial calculations upon quotation submission', async () => {
      // Line Item 1: 10 units @ 42,000 = 420,000
      // Line Item 2: 20 units @ 11,000 = 220,000
      // Subtotal = 640,000
      // 18% Tax = 115,200
      // Total Amount = 755,200
      const res = await request(app)
        .patch(`/api/quotations/${submittedQuotationId}`)
        .set('Cookie', vendorCookie)
        .send({
          taxRate: 18,
          paymentTerms: 'Net 45 Days',
          leadTimeDays: 12,
          notes: 'Final binding commercial bid',
          status: 'SUBMITTED',
          items: [
            {
              rfqItemId: testRfqItemId,
              unitPrice: 42000,
              deliveryLeadDays: 10,
            },
            {
              rfqItemId: testRfqItem2Id,
              unitPrice: 11000,
              deliveryLeadDays: 12,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.quotation.status).toBe('SUBMITTED');
      expect(Number(res.body.quotation.subtotal)).toBe(640000);
      expect(Number(res.body.quotation.taxAmount)).toBe(115200);
      expect(Number(res.body.quotation.totalAmount)).toBe(755200);
    });
  });

  describe('4. Real-time Deadline Guard', () => {
    beforeAll(async () => {
      // Create an expired RFQ to test deadline rejection
      // Bypass create schema check by directly updating deadline in db to past
      const rfq = await prisma.rfq.create({
        data: {
          rfqNumber: `RFQ-EXP-${Date.now()}`,
          title: 'Past Expired Procurement Window',
          description: 'Requisition with past deadline for real-time rejection test',
          category: 'Hardware',
          deliveryLocation: 'Warehouse Old',
          deadline: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          status: 'OPEN',
          createdById: (await prisma.user.findFirst({ where: { role: 'PROCUREMENT_OFFICER' } }))!.id,
          invitations: {
            create: { vendorId: testVendorId },
          },
          items: {
            create: {
              itemDescription: 'Expired line item',
              quantity: 5,
              uom: 'Units',
            },
          },
        },
        include: { items: true },
      });
      expiredRfqId = rfq.id;
    });

    it('should reject quotation submission when RFQ deadline has passed', async () => {
      const expiredItem = await prisma.rfqItem.findFirst({ where: { rfqId: expiredRfqId } });
      const res = await request(app)
        .post('/api/quotations')
        .set('Cookie', vendorCookie)
        .send({
          rfqId: expiredRfqId,
          taxRate: 18,
          paymentTerms: 'Net 30',
          leadTimeDays: 7,
          status: 'SUBMITTED',
          items: [
            {
              rfqItemId: expiredItem!.id,
              unitPrice: 1000,
              deliveryLeadDays: 5,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('deadline has passed');
    });
  });

  describe('5. Quotation Comparison Matrix & L1 Lowest Price', () => {
    it('should return side-by-side comparison matrix with accurate L1 determination', async () => {
      // Seeded RFQ-2026-0001 has 3 competing bids:
      // Infra Supplies (₹1,85,400.00) - L1
      // TechCore Solutions (₹2,00,010.00)
      // FastLog Logistics (₹2,19,800.00)
      const seededRfq = await prisma.rfq.findFirst({
        where: { rfqNumber: 'RFQ-2026-0001' },
      });
      expect(seededRfq).toBeDefined();

      const res = await request(app)
        .get(`/api/rfqs/${seededRfq!.id}/comparison`)
        .set('Cookie', officerCookie);

      expect(res.status).toBe(200);
      expect(res.body.totalQuotationsCount).toBe(3);
      expect(res.body.lowestPrice).toBe(185400);

      // Verify that Infra Supplies has isLowest === true
      const l1Bid = res.body.quotations.find((q: any) => q.isLowest);
      expect(l1Bid).toBeDefined();
      expect(l1Bid.vendorName).toContain('Infra Supplies');
      expect(l1Bid.grandTotal).toBe(185400);
    });
  });

  describe('6. Selected Quotation Integrity & Single-Select Transaction', () => {
    it('should allow Procurement Officer to select a quotation for approval', async () => {
      const seededRfq = await prisma.rfq.findFirst({
        where: { rfqNumber: 'RFQ-2026-0001' },
        include: { quotations: true },
      });
      const winningQuote = seededRfq!.quotations[0];

      const res = await request(app)
        .post(`/api/rfqs/${seededRfq!.id}/select-quotation`)
        .set('Cookie', officerCookie)
        .send({ quotationId: winningQuote.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rfq.selectedQuotationId).toBe(winningQuote.id);
      expect(res.body.quotation.status).toBe('SELECTED');
    });

    it('should reject selection if quotation belongs to a different RFQ', async () => {
      const seededRfq = await prisma.rfq.findFirst({
        where: { rfqNumber: 'RFQ-2026-0001' },
      });
      // Try to select the quotation from testRfqId on seededRfq
      const res = await request(app)
        .post(`/api/rfqs/${seededRfq!.id}/select-quotation`)
        .set('Cookie', officerCookie)
        .send({ quotationId: submittedQuotationId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to');
    });

    it('should forbid Vendor from selecting a quotation', async () => {
      const seededRfq = await prisma.rfq.findFirst({
        where: { rfqNumber: 'RFQ-2026-0001' },
        include: { quotations: true },
      });
      const res = await request(app)
        .post(`/api/rfqs/${seededRfq!.id}/select-quotation`)
        .set('Cookie', vendorCookie)
        .send({ quotationId: seededRfq!.quotations[0].id });

      expect(res.status).toBe(403);
    });
  });

  describe('7. Attachment Persistence & Integrity', () => {
    it('should allow Procurement Officer to upload a PDF attachment and download it', async () => {
      const dummyPdfContent = Buffer.from('%PDF-1.4 sample test specification binary payload');

      const uploadRes = await request(app)
        .post(`/api/rfqs/${testRfqId}/attachments`)
        .set('Cookie', officerCookie)
        .attach('file', dummyPdfContent, 'tech_specs_rack.pdf');

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.attachment.fileName).toBe('tech_specs_rack.pdf');

      const attachmentId = uploadRes.body.attachment.id;

      // Now download attachment
      const downloadRes = await request(app)
        .get(`/api/rfqs/${testRfqId}/attachments/${attachmentId}`)
        .set('Cookie', vendorCookie);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toContain('application/pdf');
      expect(downloadRes.headers['content-disposition']).toContain('tech_specs_rack.pdf');
    });
  });

  afterAll(async () => {
    // Clean up only the specific isolated fixtures created during this test suite run
    try {
      if (testRfqId) {
        await prisma.rfqAttachment.deleteMany({ where: { rfqId: testRfqId } });
        await prisma.quotationItem.deleteMany({ where: { quotation: { rfqId: testRfqId } } });
        await prisma.quotation.deleteMany({ where: { rfqId: testRfqId } });
        await prisma.rfqVendorInvitation.deleteMany({ where: { rfqId: testRfqId } });
        await prisma.rfqItem.deleteMany({ where: { rfqId: testRfqId } });
        await prisma.rfq.deleteMany({ where: { id: testRfqId } });
      }
      if (expiredRfqId) {
        await prisma.rfqVendorInvitation.deleteMany({ where: { rfqId: expiredRfqId } });
        await prisma.rfqItem.deleteMany({ where: { rfqId: expiredRfqId } });
        await prisma.rfq.deleteMany({ where: { id: expiredRfqId } });
      }
    } catch (err) {
      console.warn('Test fixture cleanup warning:', err);
    } finally {
      await prisma.$disconnect();
    }
  });
});
