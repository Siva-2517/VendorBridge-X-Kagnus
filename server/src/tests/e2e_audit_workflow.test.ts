import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { isSafeTestDatabaseConfigured } from './testDbGuard';
import { Prisma } from '@prisma/client';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('VendorBridge Week 3 Release Readiness: Complete 12-Step E2E Verification', () => {
  let officerCookie: string;
  let adminCookie: string;
  let managerCookie: string;
  let vendor1Cookie: string;
  let vendor2Cookie: string;

  let vendor1Id: string;
  let vendor2Id: string;

  let createdRfqId: string;
  let createdRfqNumber: string;
  let quote1Id: string;
  let quote2Id: string;
  let approvalRequestId: string;
  let poId: string;
  let poNumber: string;
  let invoiceId: string;
  let invoiceNumber: string;

  beforeAll(async () => {
    // 1. Authenticate Procurement Officer
    const offLogin = await request(app).post('/api/auth/login').send({
      email: 'officer@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(offLogin.status).toBe(200);
    const offCookies = offLogin.headers['set-cookie'];
    officerCookie = Array.isArray(offCookies) ? offCookies[0] : (offCookies as unknown as string);

    // 2. Authenticate Manager
    const mgrLogin = await request(app).post('/api/auth/login').send({
      email: 'manager@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(mgrLogin.status).toBe(200);
    const mgrCookies = mgrLogin.headers['set-cookie'];
    managerCookie = Array.isArray(mgrCookies) ? mgrCookies[0] : (mgrCookies as unknown as string);

    // 3. Authenticate Admin
    const admLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(admLogin.status).toBe(200);
    const admCookies = admLogin.headers['set-cookie'];
    adminCookie = Array.isArray(admCookies) ? admCookies[0] : (admCookies as unknown as string);

    // 4. Authenticate Vendor 1 (Infra Supplies Pvt Ltd - Maharashtra)
    const venLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(venLogin.status).toBe(200);
    const venCookies = venLogin.headers['set-cookie'];
    vendor1Cookie = Array.isArray(venCookies) ? venCookies[0] : (venCookies as unknown as string);

    const v1User = await prisma.user.findUnique({
      where: { email: 'vendor@infrasupplies.com' },
      include: { vendorProfile: true },
    });
    vendor1Id = v1User?.vendorProfile?.id || 'vnd-01';

    // 5. Register Vendor 2 (Competitor for isolation testing)
    const v2Email = `e2e_competitor_${Date.now()}@example.com`;
    const v2Reg = await request(app).post('/api/auth/register').send({
      firstName: 'Competitor',
      lastName: 'Vendor',
      email: v2Email,
      password: 'VendorBridge@2025',
      phoneNumber: '+91 9988776655',
    });
    expect(v2Reg.status).toBe(201);
    const v2Cookies = v2Reg.headers['set-cookie'];
    vendor2Cookie = Array.isArray(v2Cookies) ? v2Cookies[0] : (v2Cookies as unknown as string);

    await prisma.vendor.update({
      where: { id: 'vnd-02' },
      data: { userId: v2Reg.body.user.id },
    });
    vendor2Id = 'vnd-02';
  });

  afterAll(async () => {
    // Clean up created E2E records
    if (createdRfqId) {
      const pos = await prisma.purchaseOrder.findMany({ where: { rfqId: createdRfqId } });
      for (const po of pos) {
        await prisma.invoiceItem.deleteMany({ where: { invoice: { purchaseOrderId: po.id } } });
        await prisma.invoice.deleteMany({ where: { purchaseOrderId: po.id } });
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: po.id } });
        await prisma.purchaseOrder.delete({ where: { id: po.id } });
      }
      await prisma.quotationItem.deleteMany({ where: { quotation: { rfqId: createdRfqId } } });
      await prisma.approvalHistory.deleteMany({ where: { approvalRequest: { rfqId: createdRfqId } } });
      await prisma.approvalRequest.deleteMany({ where: { rfqId: createdRfqId } });
      await prisma.quotation.deleteMany({ where: { rfqId: createdRfqId } });
      await prisma.rfqVendorInvitation.deleteMany({ where: { rfqId: createdRfqId } });
      await prisma.rfqItem.deleteMany({ where: { rfqId: createdRfqId } });
      await prisma.rfq.deleteMany({ where: { id: createdRfqId } });
    }

    await prisma.vendor.update({
      where: { id: 'vnd-02' },
      data: { userId: null },
    });
  });

  // Step 1: Create an RFQ
  it('Step 1: creates an RFQ as Procurement Officer', async () => {
    const res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'E2E Industrial CNC Lathe & Tooling Procurement',
        description: 'Comprehensive procurement of CNC precision tooling for plant expansion',
        category: 'Machinery',
        deliveryLocation: 'Central Warehouse, Mumbai, Maharashtra',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        vendorIds: [vendor1Id, vendor2Id],
        items: [
          {
            itemDescription: 'CNC High-Speed Lathe Spindle 12000 RPM',
            quantity: 2,
            uom: 'NOS',
            targetPrice: 75000,
          },
          {
            itemDescription: 'Carbide Insert Tooling Kit (Set of 10)',
            quantity: 5,
            uom: 'NOS',
            targetPrice: 10000,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.rfq.id).toBeDefined();
    expect(res.body.rfq.rfqNumber).toMatch(/^RFQ-\d{4}-\d{4}$/);
    expect(res.body.rfq.status).toBe('OPEN');
    expect(res.body.rfq.items.length).toBe(2);

    createdRfqId = res.body.rfq.id;
    createdRfqNumber = res.body.rfq.rfqNumber;
  });

  // Step 2: Submit vendor quotations
  it('Step 2: submits quotations from competing vendors', async () => {
    const rfqRecord = await prisma.rfq.findUnique({
      where: { id: createdRfqId },
      include: { items: true },
    });
    expect(rfqRecord).not.toBeNull();
    const items = rfqRecord!.items;

    // Vendor 1 quotation
    const quote1Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendor1Cookie])
      .send({
        rfqId: createdRfqId,
        deliveryDays: 10,
        paymentTerms: 'Net 30',
        taxRate: 18,
        notes: 'Top tier Japanese bearings included',
        items: [
          { rfqItemId: items[0].id, unitPrice: 70000 }, // 2 * 70,000 = 140,000
          { rfqItemId: items[1].id, unitPrice: 9000 },  // 5 * 9,000 = 45,000
        ],
      });

    expect(quote1Res.status).toBe(201);
    expect(quote1Res.body.quotation.status).toBe('SUBMITTED');
    expect(quote1Res.body.quotation.subtotalAmount).toBe(185000);
    expect(quote1Res.body.quotation.taxAmount).toBe(33300);
    expect(quote1Res.body.quotation.grandTotal).toBe(218300);
    quote1Id = quote1Res.body.quotation.id;

    // Vendor 2 quotation
    const quote2Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendor2Cookie])
      .send({
        rfqId: createdRfqId,
        deliveryDays: 14,
        paymentTerms: 'Net 45',
        taxRate: 18,
        notes: 'Alternative high grade tooling package',
        items: [
          { rfqItemId: items[0].id, unitPrice: 74000 },
          { rfqItemId: items[1].id, unitPrice: 9500 },
        ],
      });

    expect(quote2Res.status).toBe(201);
    expect(quote2Res.body.quotation.status).toBe('SUBMITTED');
    quote2Id = quote2Res.body.quotation.id;
  });

  // Step 3: Select a quotation
  it('Step 3: selects quotation 1 as Procurement Officer and generates pending ApprovalRequest', async () => {
    const res = await request(app)
      .post(`/api/rfqs/${createdRfqId}/select-quotation`)
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote1Id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify RFQ selectedQuotationId and status
    const updatedRfq = await prisma.rfq.findUnique({ where: { id: createdRfqId } });
    expect(updatedRfq?.selectedQuotationId).toBe(quote1Id);

    // Verify Quotation status is SELECTED
    const updatedQuote = await prisma.quotation.findUnique({ where: { id: quote1Id } });
    expect(updatedQuote?.status).toBe('SELECTED');

    // Verify ApprovalRequest created with PENDING status
    const approval = await prisma.approvalRequest.findUnique({
      where: { quotationId: quote1Id },
      include: { history: true },
    });
    expect(approval).not.toBeNull();
    expect(approval?.status).toBe('PENDING');
    expect(approval?.submittedById).toBeDefined();
    expect(approval?.history.length).toBe(1);
    expect(approval?.history[0].action).toBe('SUBMITTED');

    approvalRequestId = approval!.id;
  });

  // Step 4: Approve it as an authorized manager
  it('Step 4: approves quotation as authorized Manager', async () => {
    const listRes = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Cookie', [managerCookie]);
    expect(listRes.status).toBe(200);
    const targetApproval = listRes.body.approvals.find((a: any) => a.id === approvalRequestId);
    expect(targetApproval).toBeDefined();

    const decideRes = await request(app)
      .post(`/api/approvals/${approvalRequestId}/decide`)
      .set('Cookie', [managerCookie])
      .send({
        decision: 'APPROVE',
        remarks: 'Commercial terms, pricing, and 10-day lead time verified and approved',
      });

    expect(decideRes.status).toBe(200);
    expect(decideRes.body.approval.status).toBe('APPROVED');
    expect(decideRes.body.approval.decidedAt).toBeDefined();

    // Verify persisted quotation status transitioned to APPROVED
    const approvedQuote = await prisma.quotation.findUnique({ where: { id: quote1Id } });
    expect(approvedQuote?.status).toBe('APPROVED');

    // Verify ApprovalHistory recorded immutable audit entry
    const history = await prisma.approvalHistory.findMany({
      where: { approvalRequestId },
      orderBy: { createdAt: 'asc' },
    });
    expect(history.length).toBe(2);
    expect(history[1].action).toBe('APPROVED');
    expect(history[1].remarks).toContain('Commercial terms');
  });

  // Step 5: Generate a PO
  it('Step 5: generates a Purchase Order from the approved quotation', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote1Id });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.purchaseOrder.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
    expect(res.body.purchaseOrder.status).toBe('APPROVED');

    poId = res.body.purchaseOrder.id;
    poNumber = res.body.purchaseOrder.poNumber;
  });

  // Step 6: Verify PO details and totals
  it('Step 6: verifies PO details, item copy accuracy, and authoritative Decimal totals', async () => {
    const res = await request(app)
      .get(`/api/purchase-orders/${poId}`)
      .set('Cookie', [officerCookie]);

    expect(res.status).toBe(200);
    const po = res.body.purchaseOrder;
    expect(po.poNumber).toBe(poNumber);
    expect(po.vendorId).toBe(vendor1Id);
    expect(po.rfqId).toBe(createdRfqId);
    expect(po.quotationId).toBe(quote1Id);
    expect(Number(po.subtotalAmount)).toBe(185000);
    expect(Number(po.taxAmount)).toBe(33300);
    expect(Number(po.grandTotal)).toBe(218300);

    // Verify copied line items
    expect(po.items.length).toBe(2);
    expect(po.items[0].itemDescription).toBe('CNC High-Speed Lathe Spindle 12000 RPM');
    expect(Number(po.items[0].quantity)).toBe(2);
    expect(Number(po.items[0].unitPrice)).toBe(70000);
    expect(Number(po.items[0].lineTotal)).toBe(140000);

    expect(po.items[1].itemDescription).toBe('Carbide Insert Tooling Kit (Set of 10)');
    expect(Number(po.items[1].quantity)).toBe(5);
    expect(Number(po.items[1].unitPrice)).toBe(9000);
    expect(Number(po.items[1].lineTotal)).toBe(45000);
  });

  // Step 7: Generate an invoice
  it('Step 7: generates an Invoice against the eligible purchase order', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Cookie', [officerCookie])
      .send({
        purchaseOrderId: poId,
        customNotes: 'Official tax invoice for CNC Lathe procurement',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(res.body.invoice.status).toBe('PENDING_PAYMENT');
    expect(res.body.invoice.purchaseOrderId).toBe(poId);
    expect(res.body.invoice.vendorId).toBe(vendor1Id);

    invoiceId = res.body.invoice.id;
    invoiceNumber = res.body.invoice.invoiceNumber;
  });

  // Step 8: Verify three-way matching
  it('Step 8: verifies authoritative 3-Way Matching and tax breakdown', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Cookie', [officerCookie]);

    expect(res.status).toBe(200);
    const inv = res.body.invoice;

    expect(Number(inv.subtotalAmount)).toBe(185000);
    expect(Number(inv.taxRate)).toBe(18);
    expect(Number(inv.taxAmount)).toBe(33300);
    expect(Number(inv.grandTotal)).toBe(218300);

    // Verify intra-state CGST + SGST breakdown (Vendor in Maharashtra, Delivery in Mumbai Maharashtra)
    expect(inv.taxBreakdown).toBeDefined();
    expect(inv.taxBreakdown.type).toBe('CGST_SGST');
    expect(inv.taxBreakdown.cgstRate).toBe(9);
    expect(inv.taxBreakdown.sgstRate).toBe(9);
    expect(inv.taxBreakdown.cgstAmount).toBe(16650);
    expect(inv.taxBreakdown.sgstAmount).toBe(16650);
    expect(inv.taxBreakdown.cgstAmount + inv.taxBreakdown.sgstAmount).toBe(33300);

    // Verify 3-Way Matching result
    expect(inv.matchingResult).toBeDefined();
    expect(inv.matchingResult.isMatched).toBe(true);
    expect(inv.matchingResult.discrepancies).toEqual([]);
    expect(inv.matchingResult.details.poNumber).toBe(poNumber);
    expect(inv.matchingResult.details.quotationNumber).toBeDefined();
  });

  // Step 9: Generate and download the PDF
  it('Step 9: generates and streams binary PDF invoice with proper headers', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}/pdf`)
      .set('Cookie', [officerCookie]);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`Invoice-${invoiceNumber}.pdf`);

    // Verify valid PDF magic bytes (%PDF-)
    const bodyBuffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.text);
    const magic = bodyBuffer.subarray(0, 5).toString('ascii');
    expect(magic).toBe('%PDF-');
  });

  // Step 10: Verify email behavior with SMTP unconfigured
  it('Step 10: verifies truthful, graceful email status when SMTP is unconfigured', async () => {
    const res = await request(app)
      .post(`/api/invoices/${invoiceId}/email`)
      .set('Cookie', [officerCookie])
      .send({ recipientEmail: 'vendor@infrasupplies.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EMAIL_NOT_CONFIGURED');
    expect(res.body.message).toContain('SMTP email delivery is not configured');
    expect(res.body.recipient).toBe('vendor@infrasupplies.com');
  });

  // Step 11: Mark the invoice as paid as authorized Administrator
  it('Step 11: enforces payment authorization: forbids Officer, allows Admin with audit log', async () => {
    // 1. Officer attempt -> 403 Forbidden
    const offAttempt = await request(app)
      .post(`/api/invoices/${invoiceId}/mark-paid`)
      .set('Cookie', [officerCookie])
      .send({ notes: 'Officer attempting payment' });
    expect(offAttempt.status).toBe(403);
    expect(offAttempt.body.error).toBe('Forbidden');

    // 2. Admin attempt -> 200 OK
    const admRes = await request(app)
      .post(`/api/invoices/${invoiceId}/mark-paid`)
      .set('Cookie', [adminCookie])
      .send({ notes: 'UTR-9876543210 wire payment cleared via State Bank of India' });

    expect(admRes.status).toBe(200);
    expect(admRes.body.success).toBe(true);
    expect(admRes.body.invoice.status).toBe('PAID');
    expect(admRes.body.invoice.paidAt).toBeDefined();

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'INVOICE_PAID', details: { contains: invoiceNumber } },
    });
    expect(audit).not.toBeNull();
  });

  // Step 12: Verify that vendors cannot access another vendor's records
  it('Step 12: strictly enforces vendor data isolation across all invoice operations', async () => {
    // Vendor 1 (owner) can view own invoice
    const v1Res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Cookie', [vendor1Cookie]);
    expect(v1Res.status).toBe(200);
    expect(v1Res.body.invoice.id).toBe(invoiceId);

    // Vendor 2 (competitor) CANNOT view Vendor 1 invoice
    const v2DetailRes = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Cookie', [vendor2Cookie]);
    expect(v2DetailRes.status).toBe(403);
    expect(v2DetailRes.body.error).toBe('Forbidden');

    // Vendor 2 CANNOT download Vendor 1 invoice PDF
    const v2PdfRes = await request(app)
      .get(`/api/invoices/${invoiceId}/pdf`)
      .set('Cookie', [vendor2Cookie]);
    expect(v2PdfRes.status).toBe(403);

    // Vendor 2 CANNOT email Vendor 1 invoice
    const v2EmailRes = await request(app)
      .post(`/api/invoices/${invoiceId}/email`)
      .set('Cookie', [vendor2Cookie])
      .send({ recipientEmail: 'vendor2@example.com' });
    expect(v2EmailRes.status).toBe(403);

    // Vendor 2 invoice list does NOT contain Vendor 1 invoice
    const v2ListRes = await request(app)
      .get('/api/invoices')
      .set('Cookie', [vendor2Cookie]);
    expect(v2ListRes.status).toBe(200);
    const leaked = v2ListRes.body.invoices.some((inv: any) => inv.id === invoiceId);
    expect(leaked).toBe(false);
  });
});
