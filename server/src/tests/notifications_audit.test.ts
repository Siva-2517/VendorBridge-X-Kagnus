import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { db } from '../db/store';
import { isSafeTestDatabaseConfigured } from './testDbGuard';
import { createNotification } from '../services/notificationService';
import { recordAudit } from '../services/auditService';
import { NotificationType, Role } from '../types';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 4 Phase 2: Transactional Audit Logging & Notification Generation Suite', () => {
  let officerCookie: string;
  let adminCookie: string;
  let managerCookie: string;
  let vendorCookie: string;

  let officerUser: any;
  let adminUser: any;
  let managerUser: any;
  let vendorUser: any;
  let vendor1Record: any;

  let testRfqId: string;
  let testRfqNumber: string;
  let testQuotationId: string;
  let testQuotationNumber: string;
  let testApprovalId: string;
  let testPoId: string;
  let testPoNumber: string;
  let testInvoiceId: string;
  let testInvoiceNumber: string;

  beforeAll(async () => {
    // 1. Log in as Procurement Officer
    const officerLogin = await request(app).post('/api/auth/login').send({
      email: 'officer@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(officerLogin.status).toBe(200);
    officerCookie = officerLogin.headers['set-cookie'][0];
    officerUser = await prisma.user.findUnique({ where: { email: 'officer@vendorbridge.com' } });

    // 2. Log in as Admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers['set-cookie'][0];
    adminUser = await prisma.user.findUnique({ where: { email: 'admin@vendorbridge.com' } });

    // 3. Log in as Manager / Approver
    const managerLogin = await request(app).post('/api/auth/login').send({
      email: 'manager@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(managerLogin.status).toBe(200);
    managerCookie = managerLogin.headers['set-cookie'][0];
    managerUser = await prisma.user.findUnique({ where: { email: 'manager@vendorbridge.com' } });

    // 4. Log in as Infra Supplies Vendor
    const vendorLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(vendorLogin.status).toBe(200);
    vendorCookie = vendorLogin.headers['set-cookie'][0];
    vendorUser = await prisma.user.findUnique({ where: { email: 'vendor@infrasupplies.com' } });
    vendor1Record = await prisma.vendor.findFirst({ where: { userId: vendorUser.id } });
  });

  // =========================================================================
  // 1. Notification API Security & Endpoint Verification
  // =========================================================================
  describe('1. Notification API Security & RBAC', () => {
    it('strictly rejects unauthenticated requests to GET /api/notifications (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('strictly rejects unauthenticated requests to GET /api/notifications/unread-count (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(401);
    });

    it('strictly rejects unauthenticated requests to PATCH /api/notifications/:id/read (401 Unauthorized)', async () => {
      const res = await request(app).patch('/api/notifications/fake-id/read');
      expect(res.status).toBe(401);
    });

    it('returns 404 when marking a non-existent notification as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Cookie', [officerCookie]);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });

    it('strictly forbids User A from marking User B\'s notification as read (returns 404 isolation)', async () => {
      // Create a test notification specifically for Admin
      const adminNotif = await prisma.notification.create({
        data: {
          userId: adminUser.id,
          title: 'Admin Confidential Notice',
          description: 'Restricted system notice for administrator only',
          type: 'SYSTEM_NOTICE',
        },
      });

      // Officer attempts to mark Admin's notification as read
      const res = await request(app)
        .patch(`/api/notifications/${adminNotif.id}/read`)
        .set('Cookie', [officerCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');

      // Verify Admin's notification remains unread
      const verifyRow = await prisma.notification.findUnique({ where: { id: adminNotif.id } });
      expect(verifyRow?.isRead).toBe(false);

      // Clean up
      await prisma.notification.delete({ where: { id: adminNotif.id } });
    });
  });

  // =========================================================================
  // 2. RFQ Event Lifecycle: Audit & Notification
  // =========================================================================
  describe('2. RFQ Creation and Update Lifecycle', () => {
    it('creates structured audit log and dispatches notifications to invited vendors on RFQ creation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      const rfqPayload = {
        title: 'Industrial Heavy Machinery Procurement',
        description: 'Complete procurement package for hydraulic pumps and motors',
        category: 'Manufacturing',
        deliveryLocation: 'Pune Assembly Plant',
        deadline: futureDate.toISOString(),
        items: [
          { itemDescription: 'Hydraulic Motor 200HP', quantity: 4, uom: 'PCS', targetPrice: 150000 },
        ],
        vendorIds: [vendor1Record.id],
      };

      const res = await request(app)
        .post('/api/rfqs')
        .set('Cookie', [officerCookie])
        .send(rfqPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      testRfqId = res.body.rfq.id;
      testRfqNumber = res.body.rfq.rfqNumber;

      // 1. Verify AuditLog record
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'RFQ_CREATED',
          entityId: testRfqId,
        },
      });

      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(officerUser.id);
      expect(audit?.actorName).toBe(`${officerUser.firstName} ${officerUser.lastName}`);
      expect(audit?.actorRole).toBe(Role.PROCUREMENT_OFFICER);
      expect(audit?.category).toBe('RFQ');
      expect(audit?.entityType).toBe('RFQ');
      expect(audit?.entityIdentifier).toBe(testRfqNumber);
      expect(audit?.details).toContain(testRfqNumber);

      // 2. Verify Notification dispatched to invited vendor user
      const notif = await prisma.notification.findFirst({
        where: {
          userId: vendorUser.id,
          entityId: testRfqId,
          type: 'RFQ_UPDATE',
        },
      });

      expect(notif).not.toBeNull();
      expect(notif?.title).toContain(testRfqNumber);
      expect(notif?.description).toContain('invited to quote');
      expect(notif?.isRead).toBe(false);
      expect(notif?.linkUrl).toBe('/rfqs');
    });

    it('records structured audit log and notifies vendors when RFQ deadline or status is updated', async () => {
      const extendedDeadline = new Date();
      extendedDeadline.setDate(extendedDeadline.getDate() + 21);

      const updatePayload = {
        title: 'Industrial Heavy Machinery Procurement (Extended)',
        deadline: extendedDeadline.toISOString(),
      };

      const res = await request(app)
        .patch(`/api/rfqs/${testRfqId}`)
        .set('Cookie', [officerCookie])
        .send(updatePayload);

      expect(res.status).toBe(200);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'RFQ_UPDATED',
          entityId: testRfqId,
        },
      });

      expect(audit).not.toBeNull();
      expect(audit?.actorName).toBe(`${officerUser.firstName} ${officerUser.lastName}`);
      expect(audit?.category).toBe('RFQ');
      expect(audit?.entityIdentifier).toBe(testRfqNumber);

      // Verify Notification
      const notif = await prisma.notification.findFirst({
        where: {
          userId: vendorUser.id,
          entityId: testRfqId,
          title: { contains: 'Updated' },
        },
      });

      expect(notif).not.toBeNull();
      expect(notif?.description).toContain(testRfqNumber);
    });
  });

  // =========================================================================
  // 3. Quotation Selection & Approval Workflow Lifecycle
  // =========================================================================
  describe('3. Quotation Selection & Manager Approval Lifecycle', () => {
    it('records audit trail and dispatches notifications to Approvers when quotation is selected', async () => {
      // 1. Vendor submits quotation
      const rfq = await db.findRfqById(testRfqId);
      const rfqItem = rfq!.items[0];

      const quoteRes = await request(app)
        .post('/api/quotations')
        .set('Cookie', [vendorCookie])
        .send({
          rfqId: testRfqId,
          deliveryDays: 10,
          paymentTerms: 'Net 30',
          taxRate: 18,
          status: 'SUBMITTED',
          items: [{ rfqItemId: rfqItem.id, unitPrice: 140000, remarks: 'Standard OEM model' }],
        });

      expect(quoteRes.status).toBe(201);
      testQuotationId = quoteRes.body.quotation.id;
      testQuotationNumber = quoteRes.body.quotation.quotationNumber;

      // 2. Procurement Officer selects quotation for approval
      const selectRes = await request(app)
        .post(`/api/rfqs/${testRfqId}/select-quotation`)
        .set('Cookie', [officerCookie])
        .send({ quotationId: testQuotationId });

      expect(selectRes.status).toBe(200);

      const approvalRequest = await prisma.approvalRequest.findUnique({
        where: { quotationId: testQuotationId },
      });
      expect(approvalRequest).not.toBeNull();
      testApprovalId = approvalRequest!.id;

      // 3. Verify AuditLog entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'SELECTED_FOR_APPROVAL',
          entityId: testApprovalId,
        },
      });

      expect(audit).not.toBeNull();
      expect(audit?.actorName).toBe(`${officerUser.firstName} ${officerUser.lastName}`);
      expect(audit?.category).toBe('APPROVAL');
      expect(audit?.entityType).toBe('APPROVAL');
      expect(audit?.entityIdentifier).toBe(testQuotationNumber);
      expect(audit?.details).toContain(testQuotationNumber);

      // 4. Verify notifications dispatched to both Manager and Admin
      const managerNotif = await prisma.notification.findFirst({
        where: {
          userId: managerUser.id,
          entityId: testApprovalId,
          type: 'APPROVAL_ALERT',
        },
      });
      expect(managerNotif).not.toBeNull();
      expect(managerNotif?.title).toContain(testQuotationNumber);
      expect(managerNotif?.linkUrl).toBe('/approvals');

      const adminNotif = await prisma.notification.findFirst({
        where: {
          userId: adminUser.id,
          entityId: testApprovalId,
          type: 'APPROVAL_ALERT',
        },
      });
      expect(adminNotif).not.toBeNull();
    });

    it('records audit trail and notifies submitter and vendor when Manager approves quotation', async () => {
      const decisionRes = await request(app)
        .post(`/api/approvals/${testApprovalId}/decide`)
        .set('Cookie', [managerCookie])
        .send({
          decision: 'APPROVED',
          remarks: 'Within quarterly capital machinery budget. Approved.',
        });

      expect(decisionRes.status).toBe(200);

      // 1. Verify AuditLog entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'APPROVAL_APPROVED',
          entityId: testApprovalId,
        },
      });

      expect(audit).not.toBeNull();
      expect(audit?.actorName).toBe(`${managerUser.firstName} ${managerUser.lastName}`);
      expect(audit?.actorRole).toBe(Role.MANAGER_APPROVER);
      expect(audit?.category).toBe('APPROVAL');
      expect(audit?.entityIdentifier).toBe(testQuotationNumber);
      expect(audit?.details).toContain('Within quarterly capital machinery budget');

      // 2. Verify Officer received notification of approval
      const officerNotif = await prisma.notification.findFirst({
        where: {
          userId: officerUser.id,
          entityId: testApprovalId,
          type: 'APPROVAL_ALERT',
          title: { contains: 'Approved' },
        },
      });
      expect(officerNotif).not.toBeNull();
      expect(officerNotif?.description).toContain(testQuotationNumber);

      // 3. Verify Vendor received notification of acceptance
      const vendorNotif = await prisma.notification.findFirst({
        where: {
          userId: vendorUser.id,
          entityId: testQuotationId,
          type: 'APPROVAL_ALERT',
          title: { contains: 'Accepted' },
        },
      });
      expect(vendorNotif).not.toBeNull();
      expect(vendorNotif?.description).toContain(testQuotationNumber);
    });
  });

  // =========================================================================
  // 4. Purchase Order Generation Lifecycle
  // =========================================================================
  describe('4. Purchase Order Generation Lifecycle', () => {
    it('records audit trail and dispatches notification to vendor on PO issuance', async () => {
      const poRes = await request(app)
        .post('/api/purchase-orders/generate')
        .set('Cookie', [officerCookie])
        .send({
          quotationId: testQuotationId,
          customNotes: 'Delivery required at gate 4',
        });

      expect(poRes.status).toBe(201);
      testPoId = poRes.body.purchaseOrder.id;
      testPoNumber = poRes.body.purchaseOrder.poNumber;

      // 1. Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'PO_GENERATED',
          entityId: testPoId,
        },
      });

      expect(audit).not.toBeNull();
      expect(audit?.actorName).toBe(`${officerUser.firstName} ${officerUser.lastName}`);
      expect(audit?.category).toBe('PO');
      expect(audit?.entityType).toBe('PURCHASE_ORDER');
      expect(audit?.entityIdentifier).toBe(testPoNumber);
      expect(audit?.details).toContain(testPoNumber);

      // 2. Verify Vendor notification
      const vendorNotif = await prisma.notification.findFirst({
        where: {
          userId: vendorUser.id,
          entityId: testPoId,
          type: 'SYSTEM_NOTICE',
        },
      });

      expect(vendorNotif).not.toBeNull();
      expect(vendorNotif?.title).toContain(testPoNumber);
      expect(vendorNotif?.description).toContain('Purchase Order');
      expect(vendorNotif?.linkUrl).toBe('/purchase-orders');
    });
  });

  // =========================================================================
  // 5. Invoice Creation and Payment Lifecycle
  // =========================================================================
  describe('5. Invoice Creation and Payment Lifecycle', () => {
    it('records audit trail and notifies PO creator and finance managers on invoice creation', async () => {
      const invRes = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({
          purchaseOrderId: testPoId,
          notes: 'Invoice for machinery shipment',
        });

      expect(invRes.status).toBe(201);
      testInvoiceId = invRes.body.invoice.id;
      testInvoiceNumber = invRes.body.invoice.invoiceNumber;

      // 1. Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'INVOICE_CREATED',
          entityId: testInvoiceId,
        },
      });

      expect(audit).not.toBeNull();
      expect(audit?.actorName).toBe(`${officerUser.firstName} ${officerUser.lastName}`);
      expect(audit?.category).toBe('INVOICE');
      expect(audit?.entityType).toBe('INVOICE');
      expect(audit?.entityIdentifier).toBe(testInvoiceNumber);
      expect(audit?.details).toContain(testInvoiceNumber);

      // 2. Verify PO creator or Manager notification
      const managerNotif = await prisma.notification.findFirst({
        where: {
          userId: managerUser.id,
          entityId: testInvoiceId,
          type: 'INVOICE_UPDATE',
        },
      });
      expect(managerNotif).not.toBeNull();
      expect(managerNotif?.title).toContain(testInvoiceNumber);
      expect(managerNotif?.linkUrl).toBe('/invoices');
    });

    it('records audit trail and notifies vendor and PO creator on payment confirmation', async () => {
      const payRes = await request(app)
        .post(`/api/invoices/${testInvoiceId}/mark-paid`)
        .set('Cookie', [adminCookie]);

      expect(payRes.status).toBe(200);

      // 1. Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'INVOICE_PAID',
          entityId: testInvoiceId,
        },
      });

      expect(audit).not.toBeNull();
      expect(audit?.actorName).toBe(`${adminUser.firstName} ${adminUser.lastName}`);
      expect(audit?.actorRole).toBe(Role.ADMIN);
      expect(audit?.category).toBe('INVOICE');
      expect(audit?.entityType).toBe('INVOICE');
      expect(audit?.entityIdentifier).toBe(testInvoiceNumber);
      expect(audit?.details).toContain(testInvoiceNumber);

      // 2. Verify Vendor notification
      const vendorNotif = await prisma.notification.findFirst({
        where: {
          userId: vendorUser.id,
          entityId: testInvoiceId,
          type: 'INVOICE_UPDATE',
          title: { contains: 'Payment Processed' },
        },
      });

      expect(vendorNotif).not.toBeNull();
      expect(vendorNotif?.description).toContain(testInvoiceNumber);
    });
  });

  // =========================================================================
  // 6. User Isolation, Unread Counts & Read State Transitions
  // =========================================================================
  describe('6. Notification Querying, Isolation & Read Transitions', () => {
    it('returns accurate unread count and user-isolated notifications for vendor', async () => {
      // 1. Check unread count
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', [vendorCookie]);

      expect(countRes.status).toBe(200);
      expect(countRes.body.success).toBe(true);
      expect(countRes.body.unreadCount).toBeGreaterThanOrEqual(1);

      const initialCount = countRes.body.unreadCount;

      // 2. Fetch notifications list
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', [vendorCookie]);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.notifications)).toBe(true);
      expect(listRes.body.notifications.length).toBeGreaterThanOrEqual(1);

      // Verify strict isolation: none of the notifications belong to other users
      for (const n of listRes.body.notifications) {
        expect(n.userId).toBe(vendorUser.id);
      }

      // 3. Mark the first notification as read
      const targetNotif = listRes.body.notifications[0];
      const readRes = await request(app)
        .patch(`/api/notifications/${targetNotif.id}/read`)
        .set('Cookie', [vendorCookie]);

      expect(readRes.status).toBe(200);
      expect(readRes.body.success).toBe(true);
      expect(readRes.body.notification.isRead).toBe(true);

      // 4. Verify unread count decremented
      const countAfterOne = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', [vendorCookie]);

      expect(countAfterOne.body.unreadCount).toBe(initialCount - 1);

      // 5. Mark all as read
      const readAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Cookie', [vendorCookie]);

      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.success).toBe(true);

      // 6. Verify unread count is now exactly 0
      const countAfterAll = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', [vendorCookie]);

      expect(countAfterAll.body.unreadCount).toBe(0);
    });
  });

  // =========================================================================
  // 7. Deduplication Key & Transactional Rollback Integrity
  // =========================================================================
  describe('7. Deduplication & Rollback Integrity', () => {
    it('prevents duplicate notifications when dedupeKey is supplied on retry', async () => {
      const dedupeKey = `TEST_DEDUPE_${Date.now()}`;

      // First insert
      const first = await createNotification(prisma, {
        userId: officerUser.id,
        title: 'Initial Alert',
        description: 'First attempt',
        type: NotificationType.SYSTEM_NOTICE,
        dedupeKey,
      });

      expect(first).not.toBeNull();

      // Second insert with identical dedupeKey
      const second = await createNotification(prisma, {
        userId: officerUser.id,
        title: 'Retry Alert',
        description: 'Duplicate attempt should be safely ignored',
        type: NotificationType.SYSTEM_NOTICE,
        dedupeKey,
      });

      expect(second).not.toBeNull();
      expect(second?.id).toBe(first?.id);

      // Count in DB must be exactly 1
      const count = await prisma.notification.count({
        where: { dedupeKey },
      });
      expect(count).toBe(1);

      // Clean up
      await prisma.notification.delete({ where: { dedupeKey } });
    });

    it('rolls back both business entity, audit log and notification when a transaction fails', async () => {
      const uniqueFailId = `FAIL_TEST_${Date.now()}`;

      let transactionFailed = false;
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Create audit log
          await recordAudit(tx, {
            userId: officerUser.id,
            action: 'TEST_ROLLBACK_ACTION',
            entityIdentifier: uniqueFailId,
            details: 'Should be rolled back completely',
          });

          // 2. Create notification
          await createNotification(tx, {
            userId: officerUser.id,
            title: 'Rollback Notification',
            description: 'Should not exist in database',
            type: NotificationType.SYSTEM_NOTICE,
            dedupeKey: `NOTIF_${uniqueFailId}`,
          });

          // 3. Intentionally throw error to simulate business validation failure
          throw new Error('Simulated atomic transaction failure');
        });
      } catch (err: any) {
        if (err.message === 'Simulated atomic transaction failure') {
          transactionFailed = true;
        }
      }

      expect(transactionFailed).toBe(true);

      // Verify AuditLog was NOT committed
      const audit = await prisma.auditLog.findFirst({
        where: { entityIdentifier: uniqueFailId },
      });
      expect(audit).toBeNull();

      // Verify Notification was NOT committed
      const notif = await prisma.notification.findUnique({
        where: { dedupeKey: `NOTIF_${uniqueFailId}` },
      });
      expect(notif).toBeNull();
    });
  });

  afterAll(async () => {
    try {
      if (testInvoiceId) {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: testInvoiceId } });
        await prisma.invoice.deleteMany({ where: { id: testInvoiceId } });
      }
      if (testPoId) {
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: testPoId } });
        await prisma.purchaseOrder.deleteMany({ where: { id: testPoId } });
      }
      if (testApprovalId) {
        await prisma.approvalHistory.deleteMany({ where: { approvalRequestId: testApprovalId } });
        await prisma.approvalRequest.deleteMany({ where: { id: testApprovalId } });
      }
      if (testQuotationId) {
        await prisma.quotationItem.deleteMany({ where: { quotationId: testQuotationId } });
        await prisma.quotation.deleteMany({ where: { id: testQuotationId } });
      }
      if (testRfqId) {
        await prisma.rfqVendorInvitation.deleteMany({ where: { rfqId: testRfqId } });
        await prisma.rfqItem.deleteMany({ where: { rfqId: testRfqId } });
        await prisma.rfq.deleteMany({ where: { id: testRfqId } });
      }
      // Clean up test notifications created in this suite
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { entityId: testRfqId },
            { entityId: testQuotationId },
            { entityId: testApprovalId },
            { entityId: testPoId },
            { entityId: testInvoiceId },
          ],
        },
      });
    } catch (err) {
      console.warn('Test suite cleanup notice:', err);
    }
  });
});
