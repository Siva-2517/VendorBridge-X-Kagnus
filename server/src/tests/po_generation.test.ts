import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { isSafeTestDatabaseConfigured } from './testDbGuard';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 3: Purchase Order Generation & Management Suite [MUTATING - REQUIRES TEST_DATABASE_URL]', () => {
  let officerCookie: string;
  let adminCookie: string;
  let managerCookie: string;
  let vendorCookie: string;
  let vendor2Cookie: string;

  let vendor1Id: string;
  let vendor2Id: string;

  let approvedQuotationId: string;
  let unapprovedQuotationId: string;
  let rejectedQuotationId: string;
  let generatedPOId: string;
  let generatedPONumber: string;
  const createdRfqIds: string[] = [];

  afterAll(async () => {
    // 1. Delete created Purchase Order and its items
    if (generatedPOId) {
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: generatedPOId } });
      await prisma.purchaseOrder.deleteMany({ where: { id: generatedPOId } });
    }

    // 2. Delete created RFQs, Quotations, Approvals, Items
    for (const rfqId of createdRfqIds) {
      const pos = await prisma.purchaseOrder.findMany({ where: { rfqId } });
      for (const p of pos) {
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: p.id } });
        await prisma.purchaseOrder.delete({ where: { id: p.id } });
      }
      await prisma.quotationItem.deleteMany({ where: { quotation: { rfqId } } });
      await prisma.approvalHistory.deleteMany({ where: { approvalRequest: { rfqId } } });
      await prisma.approvalRequest.deleteMany({ where: { rfqId } });
      await prisma.quotation.deleteMany({ where: { rfqId } });
      await prisma.rfqVendorInvitation.deleteMany({ where: { rfqId } });
      await prisma.rfqItem.deleteMany({ where: { rfqId } });
      await prisma.rfq.deleteMany({ where: { id: rfqId } });
    }

    // Reset vendor 2 user link
    await prisma.vendor.update({
      where: { id: 'vnd-02' },
      data: { userId: null },
    });
  });

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

    // 4. Log in as Vendor 1 (Infra Supplies)
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

    // 5. Register Vendor 2 for IDOR and isolation testing
    const v2Email = `po_test_vendor2_${Date.now()}@example.com`;
    const v2Reg = await request(app).post('/api/auth/register').send({
      firstName: 'Isolation',
      lastName: 'Tester',
      email: v2Email,
      password: 'VendorBridge@2025',
      phoneNumber: '+91 9123456789',
    });
    expect(v2Reg.status).toBe(201);
    const v2Cookies = v2Reg.headers['set-cookie'];
    vendor2Cookie = Array.isArray(v2Cookies) ? v2Cookies[0] : (v2Cookies as unknown as string);

    await prisma.vendor.update({
      where: { id: 'vnd-02' },
      data: { userId: v2Reg.body.user.id },
    });
    vendor2Id = 'vnd-02';

    // 6. Setup RFQ 1 & Approved Quotation 1
    const rfq1Res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Industrial Heavy Duty Drill Machines',
        description: 'Procurement of variable-speed industrial drills for plant operations',
        category: 'Machinery',
        deliveryLocation: 'Manufacturing Plant 4, Pune',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        vendorIds: [vendor1Id, vendor2Id],
        items: [
          {
            itemDescription: 'Industrial Hammer Drill 1200W',
            quantity: 10,
            uom: 'PCS',
            targetPrice: 7500,
          },
          {
            itemDescription: 'Cobalt Drill Bit Set 25-Piece',
            quantity: 5,
            uom: 'SET',
            targetPrice: 2000,
          },
        ],
      });
    expect(rfq1Res.status).toBe(201);
    const rfq1 = rfq1Res.body.rfq;
    createdRfqIds.push(rfq1.id);
    const rfq1Item1 = rfq1.items[0].id;
    const rfq1Item2 = rfq1.items[1].id;

    // Vendor 1 submits Quotation 1
    const quote1Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendorCookie])
      .send({
        rfqId: rfq1.id,
        deliveryDays: 14,
        paymentTerms: 'Net 30 Days',
        taxRate: 18,
        notes: 'Includes 1-year on-site manufacturer replacement warranty',
        items: [
          { rfqItemId: rfq1Item1, unitPrice: 7000 }, // 10 * 7000 = 70,000
          { rfqItemId: rfq1Item2, unitPrice: 1800 }, // 5 * 1800 = 9,000
        ], // Subtotal: 79,000; Tax (18%): 14,220; Grand Total: 93,220
      });
    expect(quote1Res.status).toBe(201);
    approvedQuotationId = quote1Res.body.quotation.id;

    // Procurement Officer selects quotation (creates pending ApprovalRequest)
    const selectRes = await request(app)
      .post(`/api/rfqs/${rfq1.id}/select-quotation`)
      .set('Cookie', [officerCookie])
      .send({ quotationId: approvedQuotationId });
    expect(selectRes.status).toBe(200);

    // Fetch the pending approval request
    const approvalsList = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Cookie', [managerCookie]);
    const approvalReq = approvalsList.body.approvals.find(
      (a: any) => a.quotationId === approvedQuotationId
    );
    expect(approvalReq).toBeDefined();

    // Manager Approves the approval request -> Quotation becomes APPROVED
    const decideRes = await request(app)
      .post(`/api/approvals/${approvalReq.id}/decide`)
      .set('Cookie', [managerCookie])
      .send({
        decision: 'APPROVE',
        remarks: 'Commercial terms and pricing are within acceptable quarterly budget.',
      });
    expect(decideRes.status).toBe(200);
    expect(decideRes.body.approval.status).toBe('APPROVED');

    // 7. Setup Quotation 2 (SUBMITTED / Unapproved) for negative testing
    const rfq2Res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Warehouse Safety Barricades',
        description: 'Modular high-visibility safety barriers',
        category: 'Safety',
        deliveryLocation: 'Central Depot, Hyderabad',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        vendorIds: [vendor1Id],
        items: [
          {
            itemDescription: 'Yellow Steel Guard Rail 2m',
            quantity: 20,
            uom: 'PCS',
            targetPrice: 3000,
          },
        ],
      });
    expect(rfq2Res.status).toBe(201);
    const rfq2 = rfq2Res.body.rfq;
    createdRfqIds.push(rfq2.id);

    const quote2Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendorCookie])
      .send({
        rfqId: rfq2.id,
        deliveryDays: 7,
        paymentTerms: 'Immediate',
        taxRate: 18,
        items: [{ rfqItemId: rfq2.items[0].id, unitPrice: 2800 }],
      });
    expect(quote2Res.status).toBe(201);
    unapprovedQuotationId = quote2Res.body.quotation.id;

    // 8. Setup Quotation 3 (REJECTED) for negative testing
    const rfq3Res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Office Ergonomic Chairs',
        description: 'High-back mesh chairs',
        category: 'Furniture',
        deliveryLocation: 'Corporate HQ, Bengaluru',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        vendorIds: [vendor1Id],
        items: [
          {
            itemDescription: 'Mesh Chair with Lumbar Support',
            quantity: 5,
            uom: 'PCS',
            targetPrice: 6000,
          },
        ],
      });
    expect(rfq3Res.status).toBe(201);
    const rfq3 = rfq3Res.body.rfq;
    createdRfqIds.push(rfq3.id);

    const quote3Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendorCookie])
      .send({
        rfqId: rfq3.id,
        deliveryDays: 20,
        paymentTerms: 'Net 15',
        taxRate: 18,
        items: [{ rfqItemId: rfq3.items[0].id, unitPrice: 9500 }], // Over budget
      });
    expect(quote3Res.status).toBe(201);
    rejectedQuotationId = quote3Res.body.quotation.id;

    // Select and then REJECT
    await request(app)
      .post(`/api/rfqs/${rfq3.id}/select-quotation`)
      .set('Cookie', [officerCookie])
      .send({ quotationId: rejectedQuotationId });

    const app3List = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Cookie', [managerCookie]);
    const app3 = app3List.body.approvals.find((a: any) => a.quotationId === rejectedQuotationId);
    expect(app3).toBeDefined();

    await request(app)
      .post(`/api/approvals/${app3.id}/decide`)
      .set('Cookie', [managerCookie])
      .send({
        decision: 'REJECT',
        remarks: 'Unit price exceeds our capital expenditure limits significantly.',
      });
  });

  // Test 1: Authoritative PO generation from approved quotation
  it('generates a purchase order from an approved quotation with exact Decimal math and sequence', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({
        quotationId: approvedQuotationId,
        notes: 'Gate entry pass required. Deliver between 9 AM and 4 PM.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.purchaseOrder).toBeDefined();

    const po = res.body.purchaseOrder;
    generatedPOId = po.id;
    generatedPONumber = po.poNumber;

    // Verify PO number format: PO-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    expect(po.poNumber).toMatch(new RegExp(`^PO-${currentYear}-\\d{4}$`));

    // Verify statuses and relationships
    expect(po.status).toBe('APPROVED');
    expect(po.quotationId).toBe(approvedQuotationId);
    expect(po.vendorId).toBe(vendor1Id);
    expect(po.notes).toBe('Gate entry pass required. Deliver between 9 AM and 4 PM.');
    expect(po.paymentTerms).toBe('Net 30 Days');
    expect(po.deliveryDays).toBe(14);

    // Verify Authoritative Decimal financial calculations:
    // Item 1: 10 * 7000 = 70,000
    // Item 2: 5 * 1800 = 9,000
    // Subtotal: 79,000
    // Tax 18%: 14,220
    // Grand Total: 93,220
    expect(po.subtotalAmount).toBe(79000);
    expect(po.taxAmount).toBe(14220);
    expect(po.grandTotal).toBe(93220);
    expect(po.amount).toBe(93220); // Legacy Week 1 backward compatibility

    // Verify line items were copied
    expect(po.items).toBeDefined();
    expect(po.items.length).toBe(2);
    expect(po.items[0].itemDescription).toBe('Industrial Hammer Drill 1200W');
    expect(po.items[0].quantity).toBe(10);
    expect(po.items[0].unitPrice).toBe(7000);
    expect(po.items[0].lineTotal).toBe(70000);

    expect(po.items[1].itemDescription).toBe('Cobalt Drill Bit Set 25-Piece');
    expect(po.items[1].quantity).toBe(5);
    expect(po.items[1].unitPrice).toBe(1800);
    expect(po.items[1].lineTotal).toBe(9000);

    // Verify audit log entry was created
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'PO_GENERATED',
        details: { contains: po.poNumber },
      },
    });
    expect(audit).toBeDefined();
  });

  // Test 2: Duplicate prevention (1 PO per Quotation)
  it('rejects duplicate PO generation for the same quotation with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: approvedQuotationId });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict');
    expect(res.body.message).toMatch(/already been generated/i);
  });

  // Test 3: Reject unapproved quotation
  it('rejects PO generation for a quotation that has not been approved (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: unapprovedQuotationId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only APPROVED quotations can be converted/i);
  });

  // Test 4: Reject rejected quotation
  it('rejects PO generation for a quotation that was rejected by manager (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: rejectedQuotationId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only APPROVED quotations can be converted/i);
  });

  // Test 5: Reject non-existent quotation
  it('returns 404 when attempting to generate PO for non-existent quotation ID', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Quotation not found/i);
  });

  // Test 6: RBAC enforcement on PO generation
  it('denies PO generation to vendor role (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [vendorCookie])
      .send({ quotationId: approvedQuotationId });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('denies unauthenticated requests to generate PO (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/generate')
      .send({ quotationId: approvedQuotationId });

    expect(res.status).toBe(401);
  });

  // Test 7: List POs and filtering
  it('retrieves purchase orders list with status and search filters', async () => {
    // List all
    const allRes = await request(app)
      .get('/api/purchase-orders')
      .set('Cookie', [adminCookie]);
    expect(allRes.status).toBe(200);
    expect(allRes.body.success).toBe(true);
    expect(Array.isArray(allRes.body.purchaseOrders)).toBe(true);

    const found = allRes.body.purchaseOrders.find((p: any) => p.id === generatedPOId);
    expect(found).toBeDefined();

    // Filter by status=APPROVED
    const appRes = await request(app)
      .get('/api/purchase-orders?status=APPROVED')
      .set('Cookie', [adminCookie]);
    expect(appRes.status).toBe(200);
    const inApproved = appRes.body.purchaseOrders.some((p: any) => p.id === generatedPOId);
    expect(inApproved).toBe(true);

    // Filter by status=CANCELLED (should not contain our approved PO)
    const canRes = await request(app)
      .get('/api/purchase-orders?status=CANCELLED')
      .set('Cookie', [adminCookie]);
    expect(canRes.status).toBe(200);
    const inCancelled = canRes.body.purchaseOrders.some((p: any) => p.id === generatedPOId);
    expect(inCancelled).toBe(false);

    // Search by PO number
    const searchRes = await request(app)
      .get(`/api/purchase-orders?search=${generatedPONumber}`)
      .set('Cookie', [adminCookie]);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.purchaseOrders.length).toBe(1);
    expect(searchRes.body.purchaseOrders[0].poNumber).toBe(generatedPONumber);
  });

  // Test 8: Single PO detail retrieval and vendor data isolation (IDOR protection)
  it('allows vendor to view their own purchase order', async () => {
    const res = await request(app)
      .get(`/api/purchase-orders/${generatedPOId}`)
      .set('Cookie', [vendorCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.purchaseOrder.id).toBe(generatedPOId);
    expect(res.body.purchaseOrder.items.length).toBe(2);
  });

  it('prevents a different vendor from accessing another vendor purchase order (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/purchase-orders/${generatedPOId}`)
      .set('Cookie', [vendor2Cookie]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.message).toMatch(/permission to view another vendor's purchase order/i);
  });

  // Test 9: Legacy Week 1 PO backward compatibility
  it('preserves legacy Week 1 purchase orders with amount float and isLegacy badge', async () => {
    // Seeded Week 1 PO 'po-01'
    const legacyPO = await prisma.purchaseOrder.findUnique({
      where: { id: 'po-01' },
    });

    if (legacyPO) {
      const res = await request(app)
        .get('/api/purchase-orders/po-01')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.purchaseOrder.id).toBe('po-01');
      expect(res.body.purchaseOrder.isLegacy).toBe(true);
      expect(res.body.purchaseOrder.amount).toBe(legacyPO.amount);
      expect(res.body.purchaseOrder.grandTotal).toBe(legacyPO.amount);
    }
  });
});
