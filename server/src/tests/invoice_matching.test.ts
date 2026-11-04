import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { db } from '../db/store';
import { isSafeTestDatabaseConfigured } from './testDbGuard';
import { calculateTaxBreakdown, validateAndExtractGstinStateCode } from '../utils/taxService';
import { performThreeWayMatch } from '../utils/matchingService';
import { Prisma } from '@prisma/client';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 3 Phase 4: Invoice Management, Tax & 3-Way Matching Suite [MUTATING - REQUIRES TEST_DATABASE_URL]', () => {
  let officerCookie: string;
  let adminCookie: string;
  let managerCookie: string;
  let vendor1Cookie: string;
  let vendor2Cookie: string;

  let vendor1Id: string;
  let vendor2Id: string;

  const createdRfqIds: string[] = [];
  let eligiblePOId: string;
  let eligiblePONumber: string;
  let eligiblePO2Id: string;
  let createdInvoiceId: string;
  let createdInvoiceNumber: string;

  let cancelledPOId: string;
  let draftPOId: string;
  let pendingPOId: string;
  let rejectedPOId: string;

  afterAll(async () => {
    // Clean up created Invoices, POs, Quotations, and RFQs
    for (const rfqId of createdRfqIds) {
      const pos = await prisma.purchaseOrder.findMany({ where: { rfqId } });
      for (const po of pos) {
        await prisma.invoiceItem.deleteMany({ where: { invoice: { purchaseOrderId: po.id } } });
        await prisma.invoice.deleteMany({ where: { purchaseOrderId: po.id } });
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: po.id } });
        await prisma.purchaseOrder.delete({ where: { id: po.id } });
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

    // 4. Log in as Vendor 1 (Infra Supplies Pvt Ltd - Maharashtra GSTIN 27AABC1576214B0)
    const vendorLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(vendorLogin.status).toBe(200);
    const venCookies = vendorLogin.headers['set-cookie'];
    vendor1Cookie = Array.isArray(venCookies) ? venCookies[0] : (venCookies as unknown as string);

    const v1User = await prisma.user.findUnique({
      where: { email: 'vendor@infrasupplies.com' },
      include: { vendorProfile: true },
    });
    vendor1Id = v1User?.vendorProfile?.id || '';

    // 5. Register Vendor 2 for IDOR and inter-state testing
    const v2Email = `inv_test_vendor2_${Date.now()}@example.com`;
    const v2Reg = await request(app).post('/api/auth/register').send({
      firstName: 'InterState',
      lastName: 'Vendor',
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

    // 6. Setup RFQ 1 & Approved Quotation 1 -> Generate PO 1
    const rfq1Res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Industrial Heavy Duty Drill Machines & Tooling',
        description: 'Plant maintenance equipment procurement',
        category: 'Machinery',
        deliveryLocation: 'Central Warehouse, Mumbai, Maharashtra', // Intra-state (27)
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        vendorIds: [vendor1Id, vendor2Id],
        items: [
          {
            itemDescription: 'Variable Speed Rotary Drill 800W',
            quantity: 10,
            uom: 'PCS',
            targetPrice: 5000,
          },
          {
            itemDescription: 'HSS Drill Bits Set 13-Piece',
            quantity: 5,
            uom: 'SET',
            targetPrice: 1500,
          },
        ],
      });
    expect(rfq1Res.status).toBe(201);
    const rfq1 = rfq1Res.body.rfq;
    createdRfqIds.push(rfq1.id);

    // Vendor 1 submits quote
    const quote1Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendor1Cookie])
      .send({
        rfqId: rfq1.id,
        deliveryDays: 14,
        paymentTerms: 'Net 30 Days',
        taxRate: 18,
        items: [
          { rfqItemId: rfq1.items[0].id, unitPrice: 4800 }, // 10 * 4800 = 48,000
          { rfqItemId: rfq1.items[1].id, unitPrice: 1400 }, // 5 * 1400 = 7,000
        ], // Subtotal: 55,000; Tax (18%): 9,900 (CGST 4,950 + SGST 4,950); Grand Total: 64,900
      });
    expect(quote1Res.status).toBe(201);
    const quote1Id = quote1Res.body.quotation.id;

    // Officer selects quotation
    await request(app)
      .post(`/api/rfqs/${rfq1.id}/select-quotation`)
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote1Id });

    // Manager approves
    const appList = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Cookie', [managerCookie]);
    const app1 = appList.body.approvals.find((a: any) => a.quotationId === quote1Id);
    expect(app1).toBeDefined();

    await request(app)
      .post(`/api/approvals/${app1.id}/decide`)
      .set('Cookie', [managerCookie])
      .send({ decision: 'APPROVE', remarks: 'Approved for procurement.' });

    // Generate PO 1 from approved quotation
    const po1Res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote1Id });
    expect(po1Res.status).toBe(201);
    eligiblePOId = po1Res.body.purchaseOrder.id;
    eligiblePONumber = po1Res.body.purchaseOrder.poNumber;

    // 7. Setup PO 2 for Concurrency Testing
    const rfq2Res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Secondary Production Conveyor Belts',
        description: 'Rubber heat-resistant conveyor belts for assembly lines',
        category: 'Machinery',
        deliveryLocation: 'Central Warehouse, Mumbai, Maharashtra',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        vendorIds: [vendor1Id],
        items: [{ itemDescription: 'Conveyor Belt 10m', quantity: 2, uom: 'PCS', targetPrice: 15000 }],
      });
    expect(rfq2Res.status).toBe(201);
    const rfq2 = rfq2Res.body.rfq;
    createdRfqIds.push(rfq2.id);

    const quote2Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendor1Cookie])
      .send({
        rfqId: rfq2.id,
        deliveryDays: 10,
        paymentTerms: 'Net 30',
        taxRate: 18,
        items: [{ rfqItemId: rfq2.items[0].id, unitPrice: 14000 }],
      });
    expect(quote2Res.status).toBe(201);

    await request(app)
      .post(`/api/rfqs/${rfq2.id}/select-quotation`)
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote2Res.body.quotation.id });

    const app2List = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Cookie', [managerCookie]);
    const app2 = app2List.body.approvals.find((a: any) => a.quotationId === quote2Res.body.quotation.id);

    await request(app)
      .post(`/api/approvals/${app2.id}/decide`)
      .set('Cookie', [managerCookie])
      .send({ decision: 'APPROVE', remarks: 'Approved' });

    const po2Res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote2Res.body.quotation.id });
    expect(po2Res.status).toBe(201);
    eligiblePO2Id = po2Res.body.purchaseOrder.id;

    // 8. Setup Ineligible POs (Cancelled, Draft, Pending, Rejected) for negative testing
    const rfq3Res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', [officerCookie])
      .send({
        title: 'Office Stationery and Paper Goods',
        description: 'Bulk procurement of office paper and stationery supplies',
        category: 'Supplies',
        deliveryLocation: 'Corporate HQ, Mumbai, Maharashtra',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        vendorIds: [vendor1Id],
        items: [{ itemDescription: 'A4 Paper Reams', quantity: 50, uom: 'BOX', targetPrice: 300 }],
      });
    expect(rfq3Res.status).toBe(201);
    const rfq3 = rfq3Res.body.rfq;
    createdRfqIds.push(rfq3.id);

    const quote3Res = await request(app)
      .post('/api/quotations')
      .set('Cookie', [vendor1Cookie])
      .send({
        rfqId: rfq3.id,
        deliveryDays: 5,
        paymentTerms: 'Immediate',
        taxRate: 18,
        items: [{ rfqItemId: rfq3.items[0].id, unitPrice: 280 }],
      });
    expect(quote3Res.status).toBe(201);

    await request(app)
      .post(`/api/rfqs/${rfq3.id}/select-quotation`)
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote3Res.body.quotation.id });

    const app3List = await request(app)
      .get('/api/approvals?status=PENDING')
      .set('Cookie', [managerCookie]);
    const app3 = app3List.body.approvals.find((a: any) => a.quotationId === quote3Res.body.quotation.id);

    await request(app)
      .post(`/api/approvals/${app3.id}/decide`)
      .set('Cookie', [managerCookie])
      .send({ decision: 'APPROVE', remarks: 'Approved' });

    const po3Res = await request(app)
      .post('/api/purchase-orders/generate')
      .set('Cookie', [officerCookie])
      .send({ quotationId: quote3Res.body.quotation.id });
    expect(po3Res.status).toBe(201);
    cancelledPOId = po3Res.body.purchaseOrder.id;

    await prisma.purchaseOrder.update({
      where: { id: cancelledPOId },
      data: { status: 'CANCELLED' },
    });

    // Create DRAFT, PENDING, REJECTED test purchase orders
    const draftPO = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-TEST-DRAFT-${Date.now()}`,
        vendorId: vendor1Id,
        amount: 5000,
        subtotalAmount: new Prisma.Decimal(5000),
        taxAmount: new Prisma.Decimal(900),
        grandTotal: new Prisma.Decimal(5900),
        status: 'DRAFT',
        orderDate: new Date(),
        rfqId: rfq3.id,
        items: {
          create: [{ itemDescription: 'Draft Item', quantity: new Prisma.Decimal(1), uom: 'PCS', unitPrice: new Prisma.Decimal(5000), lineTotal: new Prisma.Decimal(5000) }],
        },
      },
    });
    draftPOId = draftPO.id;

    const pendingPO = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-TEST-PEND-${Date.now()}`,
        vendorId: vendor1Id,
        amount: 5000,
        subtotalAmount: new Prisma.Decimal(5000),
        taxAmount: new Prisma.Decimal(900),
        grandTotal: new Prisma.Decimal(5900),
        status: 'PENDING',
        orderDate: new Date(),
        rfqId: rfq3.id,
        items: {
          create: [{ itemDescription: 'Pending Item', quantity: new Prisma.Decimal(1), uom: 'PCS', unitPrice: new Prisma.Decimal(5000), lineTotal: new Prisma.Decimal(5000) }],
        },
      },
    });
    pendingPOId = pendingPO.id;

    const rejectedPO = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-TEST-REJ-${Date.now()}`,
        vendorId: vendor1Id,
        amount: 5000,
        subtotalAmount: new Prisma.Decimal(5000),
        taxAmount: new Prisma.Decimal(900),
        grandTotal: new Prisma.Decimal(5900),
        status: 'REJECTED',
        orderDate: new Date(),
        rfqId: rfq3.id,
        items: {
          create: [{ itemDescription: 'Rejected Item', quantity: new Prisma.Decimal(1), uom: 'PCS', unitPrice: new Prisma.Decimal(5000), lineTotal: new Prisma.Decimal(5000) }],
        },
      },
    });
    rejectedPOId = rejectedPO.id;
  });

  // Test 1: Unit Tax Calculation service (CGST/SGST vs IGST, validation)
  describe('1. Tax Calculation & Multi-Tax Rules', () => {
    it('calculates intra-state CGST + SGST (9% + 9%) when vendor state matches buyer state (Maharashtra)', () => {
      const result = calculateTaxBreakdown({
        subtotal: new Prisma.Decimal(100000),
        taxRatePercent: new Prisma.Decimal(18.0),
        vendorGstin: '27AABC1576214B0', // Maharashtra (27)
        deliveryLocation: 'Central Receiving Warehouse, Site B, Navi Mumbai, Maharashtra', // Maharashtra (27)
      });

      expect(result.taxBreakdown.type).toBe('CGST_SGST');
      expect(result.taxBreakdown.isInterState).toBe(false);
      expect(result.taxBreakdown.cgstRate).toBe(9);
      expect(result.taxBreakdown.sgstRate).toBe(9);
      expect(result.taxBreakdown.cgstAmount).toBe(9000);
      expect(result.taxBreakdown.sgstAmount).toBe(9000);
      expect(result.taxAmount.toNumber()).toBe(18000);
      expect(result.grandTotal.toNumber()).toBe(118000);
    });

    it('calculates inter-state IGST (18%) when vendor state differs from buyer state', () => {
      const result = calculateTaxBreakdown({
        subtotal: new Prisma.Decimal(100000),
        taxRatePercent: new Prisma.Decimal(18.0),
        vendorGstin: '29AABC1576214B0', // Karnataka (29)
        deliveryLocation: 'Central Receiving Warehouse, Navi Mumbai, Maharashtra', // Maharashtra (27)
      });

      expect(result.taxBreakdown.type).toBe('IGST');
      expect(result.taxBreakdown.isInterState).toBe(true);
      expect(result.taxBreakdown.igstRate).toBe(18);
      expect(result.taxBreakdown.igstAmount).toBe(18000);
      expect(result.taxAmount.toNumber()).toBe(18000);
      expect(result.grandTotal.toNumber()).toBe(118000);
    });

    it('rejects negative tax rates with clear error', () => {
      expect(() =>
        calculateTaxBreakdown({
          subtotal: new Prisma.Decimal(50000),
          taxRatePercent: new Prisma.Decimal(-5),
          vendorGstin: '27AABC1576214B0',
          deliveryLocation: 'Mumbai, Maharashtra',
        })
      ).toThrow(/Tax rate cannot be negative/i);
    });

    it('rejects calculation when source tax rate is missing (no fallback assumption)', () => {
      expect(() =>
        calculateTaxBreakdown({
          subtotal: new Prisma.Decimal(50000),
          taxRatePercent: null as any,
          vendorGstin: '27AABC1576214B0',
          deliveryLocation: 'Mumbai, Maharashtra',
        })
      ).toThrow(/Missing tax information: Source tax rate is required and cannot be assumed/i);
    });

    it('rejects calculation when buyer state cannot be determined (no hardcoded state assumption)', () => {
      expect(() =>
        calculateTaxBreakdown({
          subtotal: new Prisma.Decimal(50000),
          taxRatePercent: 18,
          vendorGstin: '27AABC1576214B0',
          deliveryLocation: 'Unnamed Offshore Vessel Site X', // No resolvable state
        })
      ).toThrow(/Buyer delivery location state could not be resolved/i);
    });

    it('rejects calculation when vendor GSTIN format is invalid', () => {
      expect(() =>
        validateAndExtractGstinStateCode('INVALID_GSTIN_123')
      ).toThrow(/Invalid GSTIN format/i);
    });

    it('rejects calculation when vendor GSTIN state code is unrecognized', () => {
      expect(() =>
        validateAndExtractGstinStateCode('99AABC1576214B0')
      ).toThrow(/Invalid GSTIN state code/i);
    });
  });

  // Test 2: Unit Three-Way Matching Service
  describe('2. Three-Way Matching Service Reconciler', () => {
    it('returns isMatched: true when quotation, PO, and invoice agree 100%', () => {
      const quotation = {
        id: 'qt-1',
        quotationNumber: 'QT-2026-0001',
        status: 'APPROVED',
        taxRate: 18,
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
      };
      const po = {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        status: 'APPROVED',
        quotationId: 'qt-1',
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };
      const invoice = {
        subtotalAmount: 10000,
        taxRate: 18,
        taxAmount: 1800,
        grandTotal: 11800,
        taxBreakdown: {
          type: 'CGST_SGST' as const,
          taxRate: 18,
          totalTaxAmount: 1800,
          cgstRate: 9,
          cgstAmount: 900,
          sgstRate: 9,
          sgstAmount: 900,
        },
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };

      const match = performThreeWayMatch(quotation, po, invoice);
      expect(match.isMatched).toBe(true);
      expect(match.status).toBe('MATCHED');
      expect(match.discrepancies.length).toBe(0);
    });

    it('detects quantity over-billing and returns discrepancy', () => {
      const quotation = {
        id: 'qt-1',
        quotationNumber: 'QT-2026-0001',
        status: 'APPROVED',
        taxRate: 18,
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
      };
      const po = {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        status: 'APPROVED',
        quotationId: 'qt-1',
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };
      const invoice = {
        subtotalAmount: 12000,
        taxRate: 18,
        taxAmount: 2160,
        grandTotal: 14160,
        items: [{ itemDescription: 'Widget A', quantity: 12, uom: 'PCS', unitPrice: 1000, lineTotal: 12000 }],
      };

      const match = performThreeWayMatch(quotation, po, invoice);
      expect(match.isMatched).toBe(false);
      expect(match.status).toBe('DISCREPANCY');
      expect(match.discrepancies.some((d) => d.includes('Quantity discrepancy'))).toBe(true);
    });

    it('detects unit price mismatch and returns discrepancy', () => {
      const quotation = {
        id: 'qt-1',
        quotationNumber: 'QT-2026-0001',
        status: 'APPROVED',
        taxRate: 18,
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
      };
      const po = {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        status: 'APPROVED',
        quotationId: 'qt-1',
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };
      const invoice = {
        subtotalAmount: 15000,
        taxRate: 18,
        taxAmount: 2700,
        grandTotal: 17700,
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1500, lineTotal: 15000 }],
      };

      const match = performThreeWayMatch(quotation, po, invoice);
      expect(match.isMatched).toBe(false);
      expect(match.discrepancies.some((d) => d.includes('Unit price discrepancy'))).toBe(true);
    });

    it('detects tax rate mismatch between quotation and invoice and returns discrepancy', () => {
      const quotation = {
        id: 'qt-1',
        quotationNumber: 'QT-2026-0001',
        status: 'APPROVED',
        taxRate: 18, // 18% in quotation
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
      };
      const po = {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        status: 'APPROVED',
        quotationId: 'qt-1',
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };
      const invoice = {
        subtotalAmount: 10000,
        taxRate: 12, // 12% in invoice (mismatch!)
        taxAmount: 1200,
        grandTotal: 11200,
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };

      const match = performThreeWayMatch(quotation, po, invoice);
      expect(match.isMatched).toBe(false);
      expect(match.discrepancies.some((d) => d.includes('Tax rate mismatch'))).toBe(true);
    });

    it('detects tax breakdown sum inconsistency and returns discrepancy', () => {
      const quotation = {
        id: 'qt-1',
        quotationNumber: 'QT-2026-0001',
        status: 'APPROVED',
        taxRate: 18,
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
      };
      const po = {
        id: 'po-1',
        poNumber: 'PO-2026-0001',
        status: 'APPROVED',
        quotationId: 'qt-1',
        subtotalAmount: 10000,
        taxAmount: 1800,
        grandTotal: 11800,
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };
      const invoice = {
        subtotalAmount: 10000,
        taxRate: 18,
        taxAmount: 1800,
        grandTotal: 11800,
        taxBreakdown: {
          type: 'CGST_SGST' as const,
          taxRate: 18,
          totalTaxAmount: 1800,
          cgstRate: 9,
          cgstAmount: 800, // Discrepancy: 800 + 900 != 1800
          sgstRate: 9,
          sgstAmount: 900,
        },
        items: [{ itemDescription: 'Widget A', quantity: 10, uom: 'PCS', unitPrice: 1000, lineTotal: 10000 }],
      };

      const match = performThreeWayMatch(quotation, po, invoice);
      expect(match.isMatched).toBe(false);
      expect(match.discrepancies.some((d) => d.includes('Tax breakdown discrepancy'))).toBe(true);
    });
  });

  // Test 3: Backend API Invoice Generation & Eligibility
  describe('3. Invoice Creation & API Lifecycle', () => {
    it('creates an invoice from an eligible PO with atomic sequence and Decimal calculations', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({
          purchaseOrderId: eligiblePOId,
          notes: 'Standard payment upon central store receipt verification.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.invoice).toBeDefined();

      const inv = res.body.invoice;
      createdInvoiceId = inv.id;
      createdInvoiceNumber = inv.invoiceNumber;

      // Verify sequence format: INV-YYYY-XXXX
      const currentYear = new Date().getFullYear();
      expect(inv.invoiceNumber).toMatch(new RegExp(`^INV-${currentYear}-\\d{4}$`));

      expect(inv.purchaseOrderId).toBe(eligiblePOId);
      expect(inv.status).toBe('PENDING_PAYMENT');
      expect(inv.notes).toBe('Standard payment upon central store receipt verification.');

      // Subtotal: 55,000; Tax: 9,900; Grand Total: 64,900
      expect(inv.subtotalAmount).toBe(55000);
      expect(inv.taxAmount).toBe(9900);
      expect(inv.grandTotal).toBe(64900);

      // Verify CGST & SGST split (9% + 9%)
      expect(inv.taxBreakdown).toBeDefined();
      expect(inv.taxBreakdown.type).toBe('CGST_SGST');
      expect(inv.taxBreakdown.cgstAmount).toBe(4950);
      expect(inv.taxBreakdown.sgstAmount).toBe(4950);

      // Verify items copied
      expect(inv.items.length).toBe(2);
      expect(inv.items[0].itemDescription).toBe('Variable Speed Rotary Drill 800W');
      expect(inv.items[0].quantity).toBe(10);
      expect(inv.items[0].unitPrice).toBe(4800);
      expect(inv.items[0].lineTotal).toBe(48000);

      // Verify 3-way match result
      expect(inv.matchingResult).toBeDefined();
      expect(inv.matchingResult.isMatched).toBe(true);
    });

    it('rejects duplicate invoice creation for the same PO with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({ purchaseOrderId: eligiblePOId });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toMatch(/already been generated/i);
    });

    it('handles concurrent duplicate invoice creation safely with exactly one 201 and one 409', async () => {
      // Send two concurrent creation requests for eligiblePO2Id
      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/invoices')
          .set('Cookie', [officerCookie])
          .send({ purchaseOrderId: eligiblePO2Id, notes: 'Concurrent request A' }),
        request(app)
          .post('/api/invoices')
          .set('Cookie', [officerCookie])
          .send({ purchaseOrderId: eligiblePO2Id, notes: 'Concurrent request B' }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Confirm exactly one invoice exists in DB for eligiblePO2Id
      const count = await prisma.invoice.count({ where: { purchaseOrderId: eligiblePO2Id } });
      expect(count).toBe(1);
    });

    it('rejects invoice creation for ineligible PO statuses (CANCELLED, DRAFT, PENDING, REJECTED)', async () => {
      // CANCELLED
      const resCancelled = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({ purchaseOrderId: cancelledPOId });
      expect(resCancelled.status).toBe(400);
      expect(resCancelled.body.message).toMatch(/cancelled purchase order/i);

      // DRAFT
      const resDraft = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({ purchaseOrderId: draftPOId });
      expect(resDraft.status).toBe(400);
      expect(resDraft.body.message).toMatch(/Only APPROVED or ISSUED purchase orders can be invoiced/i);

      // PENDING
      const resPending = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({ purchaseOrderId: pendingPOId });
      expect(resPending.status).toBe(400);
      expect(resPending.body.message).toMatch(/Only APPROVED or ISSUED purchase orders can be invoiced/i);

      // REJECTED
      const resRejected = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({ purchaseOrderId: rejectedPOId });
      expect(resRejected.status).toBe(400);
      expect(resRejected.body.message).toMatch(/Only APPROVED or ISSUED purchase orders can be invoiced/i);
    });

    it('rejects invoice creation for a non-existent PO (404 Not Found)', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Cookie', [officerCookie])
        .send({ purchaseOrderId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Purchase order not found/i);
    });

    it('denies invoice creation to vendor role (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Cookie', [vendor1Cookie])
        .send({ purchaseOrderId: eligiblePOId });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('rolls back database transaction completely when audit log fails during invoice creation', async () => {
      const officer = await prisma.user.findUnique({ where: { email: 'officer@vendorbridge.com' } });
      const rollbackRfq = await prisma.rfq.create({
        data: {
          rfqNumber: `RFQ-TEST-RB-${Date.now()}`,
          title: 'Rollback Verification RFQ',
          description: 'Testing transaction rollback upon audit failure',
          category: 'Machinery',
          deliveryLocation: 'Central Warehouse, Mumbai, Maharashtra',
          deadline: new Date(Date.now() + 864000000),
          createdById: officer!.id,
          status: 'CLOSED',
          items: {
            create: [{ itemDescription: 'Rollback Drill 500W', quantity: new Prisma.Decimal(2), uom: 'PCS', targetPrice: new Prisma.Decimal(5000) }],
          },
        },
        include: { items: true },
      });

      const rollbackQuote = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-TEST-RB-${Date.now()}`,
          rfqId: rollbackRfq.id,
          vendorId: vendor1Id,
          subtotalAmount: new Prisma.Decimal(10000),
          taxRate: new Prisma.Decimal(18.0),
          taxAmount: new Prisma.Decimal(1800),
          grandTotal: new Prisma.Decimal(11800),
          deliveryDays: 7,
          paymentTerms: 'Net 30',
          validityDate: new Date(Date.now() + 864000000),
          status: 'APPROVED',
          items: {
            create: [{
              rfqItemId: rollbackRfq.items[0].id,
              unitPrice: new Prisma.Decimal(5000),
              lineTotal: new Prisma.Decimal(10000),
            }],
          },
        },
      });

      createdRfqIds.push(rollbackRfq.id);

      // Create dummy PO to attempt invoice creation
      const dummyPO = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-TEST-ROLLBACK-${Date.now()}`,
          vendorId: vendor1Id,
          amount: 11800,
          subtotalAmount: new Prisma.Decimal(10000),
          taxAmount: new Prisma.Decimal(1800),
          grandTotal: new Prisma.Decimal(11800),
          status: 'APPROVED',
          orderDate: new Date(),
          rfqId: rollbackRfq.id,
          quotationId: rollbackQuote.id,
          items: {
            create: [{ itemDescription: 'Rollback Drill 500W', quantity: new Prisma.Decimal(2), uom: 'PCS', unitPrice: new Prisma.Decimal(5000), lineTotal: new Prisma.Decimal(10000) }],
          },
        },
      });

      // Spy on db.formatInvoice which runs at the very end of the $transaction callback, AFTER tx.invoice.create
      const formatSpy = vi.spyOn(db as any, 'formatInvoice').mockImplementationOnce(() => {
        throw new Error('Simulated failure during invoice post-processing inside transaction');
      });

      try {
        const res = await request(app)
          .post('/api/invoices')
          .set('Cookie', [officerCookie])
          .send({ purchaseOrderId: dummyPO.id });

        expect(res.status).toBe(500);

        // Verify that NO invoice or items were persisted (transaction rolled back)
        const orphanedInvoice = await prisma.invoice.findUnique({
          where: { purchaseOrderId: dummyPO.id },
        });
        expect(orphanedInvoice).toBeNull();
      } finally {
        formatSpy.mockRestore();
        await prisma.invoiceItem.deleteMany({ where: { invoice: { purchaseOrderId: dummyPO.id } } });
        await prisma.invoice.deleteMany({ where: { purchaseOrderId: dummyPO.id } });
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: dummyPO.id } });
        await prisma.purchaseOrder.deleteMany({ where: { id: dummyPO.id } });
        await prisma.quotationItem.deleteMany({ where: { quotationId: rollbackQuote.id } });
        await prisma.quotation.deleteMany({ where: { id: rollbackQuote.id } });
        await prisma.rfqItem.deleteMany({ where: { rfqId: rollbackRfq.id } });
        await prisma.rfq.deleteMany({ where: { id: rollbackRfq.id } });
      }
    });
  });

  // Test 4: Marking Invoices as Paid (RBAC & Status Transition)
  describe('4. Invoice Payment Authorization', () => {
    it('forbids procurement officer from marking invoice as paid (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/invoices/${createdInvoiceId}/mark-paid`)
        .set('Cookie', [officerCookie])
        .send({ notes: 'Officer attempting unauthorized payment authorization' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('allows Admin to mark an invoice as PAID with timestamp and audit log', async () => {
      const res = await request(app)
        .post(`/api/invoices/${createdInvoiceId}/mark-paid`)
        .set('Cookie', [adminCookie])
        .send({ notes: 'Bank transfer NEFT-UTR-9876543210 cleared' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.invoice.status).toBe('PAID');
      expect(res.body.invoice.paidAt).toBeDefined();

      // Check DB audit log
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'INVOICE_PAID', details: { contains: createdInvoiceNumber } },
      });
      expect(audit).toBeDefined();
    });

    it('rejects marking an already paid invoice as paid again (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/invoices/${createdInvoiceId}/mark-paid`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already been marked as paid/i);
    });
  });

  // Test 5: Listing, Details & Vendor Isolation (IDOR Protection)
  describe('5. RBAC, Queries & Vendor Isolation', () => {
    it('retrieves invoice list with status and search filters for Admin', async () => {
      const res = await request(app)
        .get(`/api/invoices?search=${createdInvoiceNumber}`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.invoices.length).toBe(1);
      expect(res.body.invoices[0].invoiceNumber).toBe(createdInvoiceNumber);
    });

    it('allows vendor to view their own invoice details (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/invoices/${createdInvoiceId}`)
        .set('Cookie', [vendor1Cookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.invoice.id).toBe(createdInvoiceId);
    });

    it('prevents a different vendor from accessing another vendor invoice (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/invoices/${createdInvoiceId}`)
        .set('Cookie', [vendor2Cookie]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toMatch(/permission to view another vendor's invoice/i);
    });
  });

  // Test 6: PDF Generation & Email Security
  describe('6. PDF Generation & Email Dispatch Security', () => {
    it('generates and streams a valid binary PDF with application/pdf header', async () => {
      const res = await request(app)
        .get(`/api/invoices/${createdInvoiceId}/pdf`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain(`attachment; filename="Invoice-${createdInvoiceNumber}.pdf"`);
      expect(res.body).toBeDefined();
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(500); // Valid PDF binary
    });

    it('forbids unauthorized vendor from downloading another vendor invoice PDF', async () => {
      const res = await request(app)
        .get(`/api/invoices/${createdInvoiceId}/pdf`)
        .set('Cookie', [vendor2Cookie]);

      expect(res.status).toBe(403);
    });

    it('forbids a vendor from emailing another vendor invoice (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/invoices/${createdInvoiceId}/email`)
        .set('Cookie', [vendor2Cookie])
        .send({ recipientEmail: 'unauthorized@target.com' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('forbids a vendor from sending an invoice to an arbitrary external email address (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/invoices/${createdInvoiceId}/email`)
        .set('Cookie', [vendor1Cookie])
        .send({ recipientEmail: 'attacker-exfiltration@malicious.org' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toMatch(/Arbitrary recipient addresses are not permitted/i);
    });

    it('truthfully reports EMAIL_NOT_CONFIGURED when SMTP credentials are absent in test environment', async () => {
      // Ensure SMTP_HOST is unset for truthful check
      const oldHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      const res = await request(app)
        .post(`/api/invoices/${createdInvoiceId}/email`)
        .set('Cookie', [adminCookie])
        .send({ recipientEmail: 'supplier@infrasupplies.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('EMAIL_NOT_CONFIGURED');
      expect(res.body.message).toMatch(/SMTP email delivery is not configured/i);

      if (oldHost) process.env.SMTP_HOST = oldHost;
    });
  });
});
