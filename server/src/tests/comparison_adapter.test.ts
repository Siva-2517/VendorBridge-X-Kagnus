import { describe, it, expect } from 'vitest';
import { adaptComparisonResponse } from '../../../client/src/services/rfqApi';

describe('Quotation Comparison Adapter Unit & Regression Tests', () => {
  it('1. should handle completely empty quotations array without crashing', () => {
    const raw = {
      rfq: {
        id: 'rfq-empty-1',
        rfqNumber: 'RFQ-2026-0001',
        title: 'Empty RFQ Test',
        category: 'IT Hardware',
        deliveryLocation: 'Mumbai Central',
        deadline: '2026-11-01T00:00:00.000Z',
        status: 'OPEN',
        selectedQuotationId: null,
        items: [
          { id: 'item-1', itemDescription: 'Server Rack 42U', quantity: 2, uom: 'Units', targetPrice: 45000 },
        ],
      },
      quotations: [],
      totalQuotationsCount: 0,
      lowestPrice: null,
      lowestBidderVendorName: null,
    };

    const matrix = adaptComparisonResponse(raw, 'rfq-empty-1');

    expect(matrix.rfq.id).toBe('rfq-empty-1');
    expect(matrix.rfq.rfqNumber).toBe('RFQ-2026-0001');
    expect(matrix.rfqItems).toHaveLength(1);
    expect(matrix.rfqItems[0].description).toBe('Server Rack 42U');
    expect(matrix.quotations).toHaveLength(0);
    expect(matrix.lowestQuotationId).toBeNull();
    expect(matrix.lowestTotalAmount).toBeNull();
    expect(matrix.totalQuotations).toBe(0);
  });

  it('2. should properly map totalAmount, leadTimeDays, vendorStatus, and quotationId so UI never crashes', () => {
    const raw = {
      rfq: {
        id: 'rfq-1',
        rfqNumber: 'RFQ-2026-0001',
        title: 'Office Furniture',
        category: 'Furniture',
        deadline: '2026-11-01T00:00:00.000Z',
        status: 'OPEN',
        items: [{ id: 'item-1', itemDescription: 'Ergonomic Chair', quantity: 10, uom: 'Nos' }],
      },
      quotations: [
        {
          id: 'quote-1',
          quotationNumber: 'QT-2026-0001',
          vendorId: 'vendor-1',
          vendorName: 'Acme Supplies',
          vendorCategory: 'Furniture',
          vendorRating: '4.8/5',
          grandTotal: 59000,
          subtotalAmount: 50000,
          taxRate: 18,
          taxAmount: 9000,
          deliveryDays: 7,
          paymentTerms: 'Net 30',
          status: 'SUBMITTED',
          isSelected: false,
          isLowest: true,
          lineItems: [
            { rfqItemId: 'item-1', itemDescription: 'Ergonomic Chair', unitPrice: 5000, lineTotal: 50000 },
          ],
          submittedAt: '2026-10-25T10:00:00.000Z',
        },
      ],
      totalQuotationsCount: 1,
      lowestPrice: 59000,
    };

    const matrix = adaptComparisonResponse(raw, 'rfq-1');
    expect(matrix.quotations).toHaveLength(1);

    const col = matrix.quotations[0];
    // Check all properties required by ComparisonVendorColumn and Quotations.tsx
    expect(col.quotationId).toBe('quote-1');
    expect(col.quotationNumber).toBe('QT-2026-0001');
    expect(col.vendorName).toBe('Acme Supplies');
    expect(col.vendorRating).toBe(4.8);
    expect(col.vendorStatus).toBe('ACTIVE');
    expect(col.status).toBe('SUBMITTED');
    expect(col.subtotal).toBe(50000);
    expect(col.taxRate).toBe(18);
    expect(col.taxAmount).toBe(9000);
    expect(col.totalAmount).toBe(59000); // CRITICAL: Quotations.tsx line 394 col.totalAmount.toLocaleString()
    expect(col.leadTimeDays).toBe(7);    // CRITICAL: Quotations.tsx line 418 col.leadTimeDays
    expect(col.isLowestPrice).toBe(true);
    expect(col.isSelected).toBe(false);
    expect(col.submittedAt).toBe('2026-10-25T10:00:00.000Z');
    expect(col.itemPrices['item-1']).toEqual({
      unitPrice: 5000,
      lineTotal: 50000,
      leadDays: 7,
    });
  });

  it('3. should handle missing line-item prices gracefully without crashing', () => {
    const raw = {
      rfq: {
        id: 'rfq-2',
        items: [
          { id: 'item-1', itemDescription: 'Item 1', quantity: 5 },
          { id: 'item-2', itemDescription: 'Item 2', quantity: 10 },
        ],
      },
      quotations: [
        {
          id: 'quote-partial',
          grandTotal: 10000,
          // Vendor only quoted item-1, missing item-2
          lineItems: [
            { rfqItemId: 'item-1', unitPrice: 2000, lineTotal: 10000 },
          ],
        },
      ],
    };

    const matrix = adaptComparisonResponse(raw, 'rfq-2');
    const col = matrix.quotations[0];

    expect(col.itemPrices['item-1']).toBeDefined();
    expect(col.itemPrices['item-1'].unitPrice).toBe(2000);
    // item-2 was not quoted
    expect(col.itemPrices['item-2']).toBeUndefined();
  });

  it('4. should handle tied lowest prices by setting isLowestPrice = true on all tied quotes', () => {
    const raw = {
      rfq: { id: 'rfq-tie' },
      quotations: [
        { id: 'q-tie-1', quotationNumber: 'QT-1', vendorName: 'Vendor A', grandTotal: 25000 },
        { id: 'q-tie-2', quotationNumber: 'QT-2', vendorName: 'Vendor B', grandTotal: 25000 },
        { id: 'q-high', quotationNumber: 'QT-3', vendorName: 'Vendor C', grandTotal: 30000 },
      ],
      lowestPrice: 25000,
      totalQuotationsCount: 3,
    };

    const matrix = adaptComparisonResponse(raw, 'rfq-tie');

    expect(matrix.quotations).toHaveLength(3);
    expect(matrix.quotations[0].isLowestPrice).toBe(true);
    expect(matrix.quotations[1].isLowestPrice).toBe(true);
    expect(matrix.quotations[2].isLowestPrice).toBe(false);
    expect(matrix.lowestTotalAmount).toBe(25000);
  });

  it('5. should handle missing or unparseable metadata safely without NaN', () => {
    const raw = {
      rfq: null,
      quotations: [
        {
          id: 'q-empty-meta',
          vendorRating: 'Not yet rated', // Unparseable rating string
          grandTotal: undefined,         // Undefined grandTotal
          subtotalAmount: null,          // Null subtotal
          taxRate: 'invalid',            // Non-numeric taxRate
          taxAmount: NaN,                // NaN taxAmount
          deliveryDays: null,
          notes: undefined,
        },
      ],
    };

    const matrix = adaptComparisonResponse(raw, 'fallback-id');
    const col = matrix.quotations[0];

    expect(col.vendorRating).toBeNull();
    expect(col.totalAmount).toBe(0);
    expect(col.grandTotal).toBe(0);
    expect(col.subtotal).toBe(0);
    expect(col.taxRate).toBe(18); // Default fallback
    expect(col.taxAmount).toBe(0);
    expect(col.leadTimeDays).toBe(0);
    expect(col.notes).toBeNull();
    expect(Number.isFinite(col.totalAmount)).toBe(true);
    expect(Number.isFinite(col.subtotal)).toBe(true);
  });
});
