import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { isSafeTestDatabaseConfigured } from './testDbGuard';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 3: Quotation Approval Workflow & Review Suite [MUTATING - REQUIRES TEST_DATABASE_URL]', () => {
  let officerCookie: string;
  let adminCookie: string;
  let managerCookie: string;
  let vendorCookie: string;
  let vendor2Cookie: string;

  let vendor1Id: string;
  let vendor2Id: string;

  let rfqId1: string;
  let rfqItem1Id: string;
  let quotation1Id: string;
  let approval1Id: string;

  let rfqId2: string;
  let rfqItem2Id: string;
  let quotation2Id: string;
  let approval2Id: string;

  beforeAll(async () => {
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

    // 3. Log in as Manager / Approver
    const managerLogin = await request(app).post('/api/auth/login').send({
      email: 'manager@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(managerLogin.status).toBe(200);
    const mgrCookies = managerLogin.headers['set-cookie'];
    managerCookie = Array.isArray(mgrCookies) ? mgrCookies[0] : (mgrCookies as unknown as string);

    // 4. Log in as Infra Supplies Vendor (Vendor 1)
    const vendorLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(vendorLogin.status).toBe(200);
    const venCookies = vendorLogin.headers['set-cookie'];
    vendorCookie = Array.isArray(venCookies) ? venCookies[0] : (venCookies as unknown as string);

    const v1User = await prisma.user.findUnique({
      where: { email: 'vendor@infrasupplies.com' },
      include: { vendorProfile: true },
    });
    vendor1Id = v1User?.vendorProfile?.id || '';

    // 5. Register & prepare Vendor 2 for isolation testing
    const v2Email = `vendor2_${Date.now()}@example.com`;
    const v2Reg = await request(app).post('/api/auth/register').send({
      firstName: 'Second',
      lastName: 'Vendor',
      email: v2Email,
      password: 'VendorBridge@2025',
      phoneNumber: '+91 9988776655',
    });
    expect(v2Reg.status).toBe(201);
    const v2Cookies = v2Reg.headers['set-cookie'];
    vendor2Cookie = Array.isArray(v2Cookies) ? v2Cookies[0] : (v2Cookies as unknown as string);

    // Link Vendor 2 user to seeded vendor 'vnd-02' (Tech Core LTD)
    await prisma.vendor.update({
      where: { id: 'vnd-02' },
      data: { userId: v2Reg.body.user.id },
    });
    vendor2Id = 'vnd-02';

    // 6. Setup RFQ 1 & Quotation 1
    const rfqRes = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Safety Helmets & Work Gear',
        description: 'Procurement of industrial hardhats and reflective jackets',
        category: 'Constructions',
        deliveryLocation: 'Construction Site B, Navi Mumbai',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        items: [
          {
            itemDescription: 'Industrial Hard Hat Class E',
            quantity: 50,
            uom: 'NOS',
            targetPrice: 650.0,
          },
        ],
        vendorIds: [vendor1Id, vendor2Id],
      });
    expect(rfqRes.status).toBe(201);
    rfqId1 = rfqRes.body.rfq.id;
    rfqItem1Id = rfqRes.body.rfq.items[0].id;

    // Vendor 1 quotes for RFQ 1
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendorCookie])
      .send({
        rfqId: rfqId1,
        deliveryDays: 7,
        paymentTerms: '30 days net',
        notes: 'Includes manufacturer warranty and ANSI test reports',
        items: [
          {
            rfqItemId: rfqItem1Id,
            unitPrice: 600.0,
            remarks: 'Bulk pricing discount applied',
          },
        ],
      });
    expect(quoteRes.status).toBe(201);
    quotation1Id = quoteRes.body.quotation.id;

    // Setup RFQ 2 for rejection test
    const rfq2Res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Office Ergonomic Desks',
        description: 'Procurement of motorized sit-stand desks',
        category: 'Furniture',
        deliveryLocation: 'HQ Floor 4, Bengaluru',
        deadline: new Date(Date.now() + 15 * 86400000).toISOString(),
        items: [
          {
            itemDescription: 'Dual-Motor Standing Desk 140x70cm',
            quantity: 10,
            uom: 'Units',
            targetPrice: 25000.0,
          },
        ],
        vendorIds: [vendor1Id],
      });
    expect(rfq2Res.status).toBe(201);
    rfqId2 = rfq2Res.body.rfq.id;
    rfqItem2Id = rfq2Res.body.rfq.items[0].id;

    const quote2Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendorCookie])
      .send({
        rfqId: rfqId2,
        deliveryDays: 14,
        paymentTerms: '45 days net',
        items: [
          {
            rfqItemId: rfqItem2Id,
            unitPrice: 32000.0,
          },
        ],
      });
    expect(quote2Res.status).toBe(201);
    quotation2Id = quote2Res.body.quotation.id;
  });

  describe('1. Atomic Approval Request Creation on Quotation Selection', () => {
    it('should create exactly one ApprovalRequest with PENDING status and audit history when selecting a quotation', async () => {
      const selectRes = await request(app)
        .post(`/api/rfqs/${rfqId1}/select-quotation`)
        .set('Cookie', [officerCookie])
        .send({ quotationId: quotation1Id });

      expect(selectRes.status).toBe(200);
      expect(selectRes.body.success).toBe(true);
      expect(selectRes.body.quotation.status).toBe('SELECTED');
      expect(selectRes.body.rfq.status).toBe('AWARDED');
      expect(selectRes.body.result.approvalRequest).toBeDefined();
      expect(selectRes.body.result.approvalRequest.status).toBe('PENDING');

      approval1Id = selectRes.body.result.approvalRequest.id;

      // Verify directly in DB
      const dbApproval = await prisma.approvalRequest.findUnique({
        where: { id: approval1Id },
        include: { history: true },
      });

      expect(dbApproval).not.toBeNull();
      expect(dbApproval?.status).toBe('PENDING');
      expect(dbApproval?.quotationId).toBe(quotation1Id);
      expect(dbApproval?.rfqId).toBe(rfqId1);
      expect(dbApproval?.history).toHaveLength(1);
      expect(dbApproval?.history[0].action).toBe('SUBMITTED');
    });

    it('should prevent duplicate pending ApprovalRequests when selecting the same quotation again', async () => {
      const reSelectRes = await request(app)
        .post(`/api/rfqs/${rfqId1}/select-quotation`)
        .set('Cookie', [officerCookie])
        .send({ quotationId: quotation1Id });

      expect(reSelectRes.status).toBe(200);
      expect(reSelectRes.body.result.approvalRequest.id).toBe(approval1Id);

      const approvalCount = await prisma.approvalRequest.count({
        where: { quotationId: quotation1Id },
      });
      expect(approvalCount).toBe(1);
    });
  });

  describe('2. Approvals Queue and Vendor Data Isolation', () => {
    it('should allow Admin and Manager to view the approvals queue with all details', async () => {
      const adminQueue = await request(app)
        .get('/api/approvals')
        .set('Cookie', [adminCookie]);

      expect(adminQueue.status).toBe(200);
      expect(adminQueue.body.success).toBe(true);
      expect(Array.isArray(adminQueue.body.approvals)).toBe(true);
      expect(adminQueue.body.approvals.some((a: any) => a.id === approval1Id)).toBe(true);

      const mgrQueue = await request(app)
        .get('/api/approvals')
        .set('Cookie', [managerCookie]);

      expect(mgrQueue.status).toBe(200);
      expect(mgrQueue.body.approvals.some((a: any) => a.id === approval1Id)).toBe(true);
    });

    it('should allow Procurement Officer to view queue to track approval progress', async () => {
      const officerQueue = await request(app)
        .get('/api/approvals')
        .set('Cookie', [officerCookie]);

      expect(officerQueue.status).toBe(200);
      expect(officerQueue.body.approvals.some((a: any) => a.id === approval1Id)).toBe(true);
    });

    it('should enforce vendor data isolation: Vendor 1 sees only own quotation approvals', async () => {
      const v1Queue = await request(app)
        .get('/api/approvals')
        .set('Cookie', [vendorCookie]);

      expect(v1Queue.status).toBe(200);
      expect(v1Queue.body.approvals.every((a: any) => a.quotation.vendorId === vendor1Id)).toBe(true);
      expect(v1Queue.body.approvals.some((a: any) => a.id === approval1Id)).toBe(true);
    });

    it('should enforce vendor data isolation: Vendor 2 cannot see Vendor 1 approval', async () => {
      const v2Queue = await request(app)
        .get('/api/approvals')
        .set('Cookie', [vendor2Cookie]);

      expect(v2Queue.status).toBe(200);
      expect(v2Queue.body.approvals.some((a: any) => a.id === approval1Id)).toBe(false);

      // Attempting to access Vendor 1 approval detail directly
      const directDetail = await request(app)
        .get(`/api/approvals/${approval1Id}`)
        .set('Cookie', [vendor2Cookie]);

      expect(directDetail.status).toBe(403);
      expect(directDetail.body.error).toBe('Forbidden');
    });

    it('should return complete detail for authorized manager including RFQ, quotation line items, and audit history', async () => {
      const detailRes = await request(app)
        .get(`/api/approvals/${approval1Id}`)
        .set('Cookie', [managerCookie]);

      expect(detailRes.status).toBe(200);
      const appData = detailRes.body.approval;
      expect(appData.id).toBe(approval1Id);
      expect(appData.rfq.rfqNumber).toBeDefined();
      expect(appData.quotation.quotationNumber).toBeDefined();
      expect(appData.quotation.vendor.name).toBeDefined();
      expect(appData.quotation.items.length).toBeGreaterThan(0);
      expect(appData.history.length).toBeGreaterThan(0);
    });
  });

  describe('3. Decision Authorization & Role Enforcement', () => {
    it('should strictly reject Procurement Officer from deciding an approval (403 Forbidden)', async () => {
      const decideRes = await request(app)
        .post(`/api/approvals/${approval1Id}/decide`)
        .set('Cookie', [officerCookie])
        .send({ decision: 'APPROVE', remarks: 'Trying to approve as officer' });

      expect(decideRes.status).toBe(403);
      expect(decideRes.body.error).toBe('Forbidden');
    });

    it('should strictly reject Vendor from deciding an approval (403 Forbidden)', async () => {
      const decideRes = await request(app)
        .post(`/api/approvals/${approval1Id}/decide`)
        .set('Cookie', [vendorCookie])
        .send({ decision: 'APPROVE', remarks: 'Trying to approve as vendor' });

      expect(decideRes.status).toBe(403);
      expect(decideRes.body.error).toBe('Forbidden');
    });

    it('should reject decision with invalid body (400 Bad Request)', async () => {
      const invalidRes = await request(app)
        .post(`/api/approvals/${approval1Id}/decide`)
        .set('Cookie', [managerCookie])
        .send({ decision: 'MAYBE', remarks: 'Invalid decision' });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error).toBe('Bad Request');
    });

    it('should return 404 for non-existent approval ID', async () => {
      const notFoundRes = await request(app)
        .post('/api/approvals/00000000-0000-0000-0000-000000000000/decide')
        .set('Cookie', [managerCookie])
        .send({ decision: 'APPROVE' });

      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.error).toBe('Not Found');
    });
  });

  describe('4. Manager Approval Execution & Immutability', () => {
    it('should allow Manager Approver to approve quotation with remarks and record audit trail', async () => {
      const remarksText = 'Approved by Department Head. Validated against safety compliance standards.';
      const approveRes = await request(app)
        .post(`/api/approvals/${approval1Id}/decide`)
        .set('Cookie', [managerCookie])
        .send({
          decision: 'APPROVE',
          remarks: remarksText,
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.approval.status).toBe('APPROVED');
      expect(approveRes.body.approval.remarks).toBe(remarksText);
      expect(approveRes.body.approval.decidedAt).toBeDefined();

      // Verify Quotation status is now APPROVED
      const updatedQuote = await prisma.quotation.findUnique({
        where: { id: quotation1Id },
      });
      expect(updatedQuote?.status).toBe('APPROVED');

      // Verify ApprovalHistory has SUBMITTED and APPROVED
      const history = await prisma.approvalHistory.findMany({
        where: { approvalRequestId: approval1Id },
        orderBy: { createdAt: 'asc' },
      });
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('SUBMITTED');
      expect(history[1].action).toBe('APPROVED');
      expect(history[1].remarks).toBe(remarksText);
    });

    it('should reject repeated decision with 409 Conflict', async () => {
      const repeatRes = await request(app)
        .post(`/api/approvals/${approval1Id}/decide`)
        .set('Cookie', [adminCookie])
        .send({ decision: 'APPROVE', remarks: 'Second approval attempt' });

      expect(repeatRes.status).toBe(409);
      expect(repeatRes.body.error).toBe('Conflict');
      expect(repeatRes.body.message).toContain('already been decided');
    });
  });

  describe('5. Manager Rejection Lifecycle & History Preservation', () => {
    it('should allow Admin to reject quotation, record rejection remarks, and preserve full history', async () => {
      // Select quotation 2
      const selectRes = await request(app)
        .post(`/api/rfqs/${rfqId2}/select-quotation`)
        .set('Cookie', [officerCookie])
        .send({ quotationId: quotation2Id });

      expect(selectRes.status).toBe(200);
      approval2Id = selectRes.body.result.approvalRequest.id;

      // Reject quotation 2
      const rejectRemarks = 'Price quote ₹32,000 exceeds allocated target budget of ₹25,000.';
      const rejectRes = await request(app)
        .post(`/api/approvals/${approval2Id}/decide`)
        .set('Cookie', [adminCookie])
        .send({
          decision: 'REJECT',
          remarks: rejectRemarks,
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.approval.status).toBe('REJECTED');
      expect(rejectRes.body.approval.remarks).toBe(rejectRemarks);

      // Verify Quotation status is REJECTED
      const updatedQuote = await prisma.quotation.findUnique({
        where: { id: quotation2Id },
      });
      expect(updatedQuote?.status).toBe('REJECTED');

      // Verify ApprovalHistory preserves SUBMITTED and REJECTED
      const history = await prisma.approvalHistory.findMany({
        where: { approvalRequestId: approval2Id },
        orderBy: { createdAt: 'asc' },
      });
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('SUBMITTED');
      expect(history[1].action).toBe('REJECTED');
      expect(history[1].remarks).toBe(rejectRemarks);

      // Rejection cannot be overwritten
      const overwriteAttempt = await request(app)
        .post(`/api/approvals/${approval2Id}/decide`)
        .set('Cookie', [managerCookie])
        .send({ decision: 'APPROVE', remarks: 'Trying to overwrite rejection' });

      expect(overwriteAttempt.status).toBe(409);
      expect(overwriteAttempt.body.error).toBe('Conflict');
    });
  });

  describe('6. Queue Status Filtering', () => {
    it('should filter approvals queue accurately by status', async () => {
      const approvedOnly = await request(app)
        .get('/api/approvals?status=APPROVED')
        .set('Cookie', [adminCookie]);

      expect(approvedOnly.status).toBe(200);
      expect(approvedOnly.body.approvals.every((a: any) => a.status === 'APPROVED')).toBe(true);
      expect(approvedOnly.body.approvals.some((a: any) => a.id === approval1Id)).toBe(true);

      const rejectedOnly = await request(app)
        .get('/api/approvals?status=REJECTED')
        .set('Cookie', [adminCookie]);

      expect(rejectedOnly.status).toBe(200);
      expect(rejectedOnly.body.approvals.every((a: any) => a.status === 'REJECTED')).toBe(true);
      expect(rejectedOnly.body.approvals.some((a: any) => a.id === approval2Id)).toBe(true);
    });
  });
});
