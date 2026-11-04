import { Prisma } from '@prisma/client';
import { ThreeWayMatchResult, TaxBreakdown } from '../types';

export interface QuotationMatchData {
  id: string;
  quotationNumber: string;
  status: string;
  taxRate?: Prisma.Decimal | number | null;
  subtotalAmount: Prisma.Decimal | number;
  taxAmount: Prisma.Decimal | number;
  grandTotal: Prisma.Decimal | number;
  items?: Array<{
    itemDescription?: string;
    quantity?: Prisma.Decimal | number;
    unitPrice: Prisma.Decimal | number;
    lineTotal: Prisma.Decimal | number;
    rfqItem?: {
      itemDescription: string;
      quantity: Prisma.Decimal | number;
      uom: string;
    };
  }>;
}

export interface PurchaseOrderMatchData {
  id: string;
  poNumber: string;
  status: string;
  subtotalAmount: Prisma.Decimal | number | null;
  taxAmount: Prisma.Decimal | number | null;
  grandTotal: Prisma.Decimal | number | null;
  amount?: number;
  quotationId?: string | null;
  items?: Array<{
    itemDescription: string;
    quantity: Prisma.Decimal | number;
    uom: string;
    unitPrice: Prisma.Decimal | number;
    lineTotal: Prisma.Decimal | number;
  }>;
}

export interface ProposedInvoiceItem {
  itemDescription: string;
  quantity: Prisma.Decimal | number;
  uom: string;
  unitPrice: Prisma.Decimal | number;
  lineTotal: Prisma.Decimal | number;
}

export interface ProposedInvoiceData {
  subtotalAmount: Prisma.Decimal | number;
  taxRate?: Prisma.Decimal | number | null;
  taxAmount: Prisma.Decimal | number;
  taxBreakdown?: TaxBreakdown | null;
  grandTotal: Prisma.Decimal | number;
  items: ProposedInvoiceItem[];
}

/**
 * Performs authoritative backend 3-way matching across Quotation, Purchase Order, and Invoice.
 * Validates references, item counts, quantities, UOM, unit prices, subtotals, tax rates, tax breakdown, and grand totals.
 */
export const performThreeWayMatch = (
  quotation: QuotationMatchData,
  po: PurchaseOrderMatchData,
  invoice: ProposedInvoiceData
): ThreeWayMatchResult => {
  const discrepancies: string[] = [];

  // 1. Reference Integrity Check
  if (po.quotationId && po.quotationId !== quotation.id) {
    discrepancies.push(
      `Reference mismatch: Purchase Order ${po.poNumber} is linked to Quotation ID ${po.quotationId}, but matched against ${quotation.id}`
    );
  }

  // 2. Lifecycle status check
  if (po.status === 'CANCELLED') {
    discrepancies.push(`Lifecycle error: Purchase Order ${po.poNumber} is CANCELLED`);
  }

  if (po.status !== 'APPROVED' && po.status !== 'ISSUED') {
    discrepancies.push(
      `Lifecycle error: Purchase Order ${po.poNumber} is in status ${po.status}. Expected APPROVED or ISSUED.`
    );
  }

  if (quotation.status !== 'APPROVED') {
    discrepancies.push(
      `Lifecycle error: Source Quotation ${quotation.quotationNumber} is ${quotation.status}. Expected APPROVED.`
    );
  }

  // 3. Item count reconciliation
  const poItems = po.items || [];
  const invoiceItems = invoice.items || [];

  let itemCountMatch = true;
  if (invoiceItems.length !== poItems.length) {
    itemCountMatch = false;
    discrepancies.push(
      `Item count mismatch: Invoice has ${invoiceItems.length} items, but Purchase Order ${po.poNumber} has ${poItems.length} items`
    );
  }

  // 4. Line items quantity, UOM, and unit price reconciliation
  let quantityMatch = true;
  let unitPriceMatch = true;

  for (let i = 0; i < invoiceItems.length; i++) {
    const invItem = invoiceItems[i];
    const poItem = poItems[i];

    if (!poItem) {
      discrepancies.push(
        `Unexpected invoice item at index ${i + 1}: '${invItem.itemDescription}' not found in PO`
      );
      itemCountMatch = false;
      continue;
    }

    const invQty = new Prisma.Decimal(invItem.quantity.toString());
    const poQty = new Prisma.Decimal(poItem.quantity.toString());
    const invPrice = new Prisma.Decimal(invItem.unitPrice.toString());
    const poPrice = new Prisma.Decimal(poItem.unitPrice.toString());

    // Quantity check: Strictly no over-billing, no under-billing (full 1:1 invoice enforcement)
    if (!invQty.equals(poQty)) {
      quantityMatch = false;
      discrepancies.push(
        `Quantity discrepancy on '${invItem.itemDescription}': Invoice quantity (${invQty.toString()}) does not match PO quantity (${poQty.toString()})`
      );
    }

    // UOM check
    if (invItem.uom.trim().toUpperCase() !== poItem.uom.trim().toUpperCase()) {
      discrepancies.push(
        `UOM discrepancy on '${invItem.itemDescription}': Invoice UOM '${invItem.uom}' does not match PO UOM '${poItem.uom}'`
      );
    }

    // Unit Price check
    if (!invPrice.equals(poPrice)) {
      unitPriceMatch = false;
      discrepancies.push(
        `Unit price discrepancy on '${invItem.itemDescription}': Invoice unit price (₹${invPrice.toString()}) does not match PO unit price (₹${poPrice.toString()})`
      );
    }
  }

  // 5. Financial totals reconciliation using Decimal
  const invSubtotal = new Prisma.Decimal(invoice.subtotalAmount.toString()).toDecimalPlaces(2);
  const poSubtotal = new Prisma.Decimal(
    (po.subtotalAmount !== null && po.subtotalAmount !== undefined ? po.subtotalAmount : po.amount || 0).toString()
  ).toDecimalPlaces(2);

  const invTax = new Prisma.Decimal(invoice.taxAmount.toString()).toDecimalPlaces(2);
  const poTax = new Prisma.Decimal(
    (po.taxAmount !== null && po.taxAmount !== undefined ? po.taxAmount : 0).toString()
  ).toDecimalPlaces(2);

  const invGrandTotal = new Prisma.Decimal(invoice.grandTotal.toString()).toDecimalPlaces(2);
  const poGrandTotal = new Prisma.Decimal(
    (po.grandTotal !== null && po.grandTotal !== undefined ? po.grandTotal : po.amount || 0).toString()
  ).toDecimalPlaces(2);

  const subtotalMatch = invSubtotal.equals(poSubtotal);
  if (!subtotalMatch) {
    discrepancies.push(
      `Subtotal mismatch: Invoice subtotal (₹${invSubtotal.toString()}) does not match PO subtotal (₹${poSubtotal.toString()})`
    );
  }

  const taxMatch = invTax.equals(poTax);
  if (!taxMatch) {
    discrepancies.push(
      `Tax mismatch: Invoice tax (₹${invTax.toString()}) does not match PO tax (₹${poTax.toString()})`
    );
  }

  // 6. Tax Rate & Tax Breakdown Validation
  let taxRateMatch = true;
  if (quotation.taxRate !== undefined && quotation.taxRate !== null && invoice.taxRate !== undefined && invoice.taxRate !== null) {
    const qRate = new Prisma.Decimal(quotation.taxRate.toString());
    const invRate = new Prisma.Decimal(invoice.taxRate.toString());
    if (!qRate.equals(invRate)) {
      taxRateMatch = false;
      discrepancies.push(
        `Tax rate mismatch: Invoice tax rate (${invRate.toString()}%) does not match source quotation tax rate (${qRate.toString()}%)`
      );
    }
  }

  // Validate tax breakdown integrity against taxAmount
  if (invoice.taxBreakdown) {
    const tb = invoice.taxBreakdown;
    if (tb.type === 'CGST_SGST') {
      const sum = new Prisma.Decimal((tb.cgstAmount || 0).toString()).add(new Prisma.Decimal((tb.sgstAmount || 0).toString()));
      if (!sum.equals(invTax)) {
        discrepancies.push(
          `Tax breakdown discrepancy: CGST (₹${tb.cgstAmount}) + SGST (₹${tb.sgstAmount}) does not sum to tax amount (₹${invTax.toString()})`
        );
      }
    } else if (tb.type === 'IGST') {
      const igstAmt = new Prisma.Decimal((tb.igstAmount || 0).toString());
      if (!igstAmt.equals(invTax)) {
        discrepancies.push(
          `Tax breakdown discrepancy: IGST (₹${tb.igstAmount}) does not equal tax amount (₹${invTax.toString()})`
        );
      }
    }
  }

  const grandTotalMatch = invGrandTotal.equals(poGrandTotal);
  if (!grandTotalMatch) {
    discrepancies.push(
      `Grand total mismatch: Invoice total (₹${invGrandTotal.toString()}) does not match PO total (₹${poGrandTotal.toString()})`
    );
  }

  const isMatched = discrepancies.length === 0 && taxRateMatch;

  return {
    isMatched,
    status: isMatched ? 'MATCHED' : 'DISCREPANCY',
    details: {
      poNumber: po.poNumber,
      quotationNumber: quotation.quotationNumber,
      itemCountMatch,
      quantityMatch,
      unitPriceMatch,
      subtotalMatch,
      taxMatch,
      grandTotalMatch,
    },
    discrepancies,
  };
};
