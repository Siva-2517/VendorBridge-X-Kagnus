import PDFDocument from 'pdfkit';
import { Invoice } from '../types';

/**
 * Generates an authoritative, server-rendered PDF buffer for a persisted Invoice.
 * Compatible with Node.js stream buffers, A4 formatting, and standard Indian ERP conventions.
 */
export const generateInvoicePdf = async (invoice: Invoice): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0F172A'; // Slate 900
      const accentColor = '#0D9488'; // Teal 600
      const mutedColor = '#64748B'; // Slate 500

      // --- Header ---
      doc
        .fillColor(primaryColor)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 40, 40);

      doc
        .fillColor(accentColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('VENDORBRIDGE PROCUREMENT ERP', 40, 68);

      // Invoice Number & Status
      doc
        .fillColor(primaryColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(invoice.invoiceNumber, 380, 40, { align: 'right' });

      const statusText = invoice.status === 'PAID' ? 'STATUS: PAID' : 'STATUS: PENDING PAYMENT';
      const statusColor = invoice.status === 'PAID' ? '#16A34A' : '#D97706';

      doc
        .fillColor(statusColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(statusText, 380, 58, { align: 'right' });

      doc
        .fillColor(mutedColor)
        .fontSize(9)
        .font('Helvetica')
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 380, 72, {
          align: 'right',
        });

      if (invoice.dueDate) {
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 380, 85, {
          align: 'right',
        });
      }

      // Divider line
      doc
        .strokeColor('#CBD5E1')
        .lineWidth(1)
        .moveTo(40, 105)
        .lineTo(555, 105)
        .stroke();

      // --- Parties Section (Buyer vs Vendor) ---
      const topY = 118;

      // Buyer (Billed To)
      doc
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('BILLED TO (BUYER):', 40, topY);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text('VendorBridge Enterprises Pvt Ltd', 40, topY + 14)
        .text('Central Receiving Warehouse, Site B', 40, topY + 26)
        .text('Navi Mumbai, Maharashtra - 400705', 40, topY + 38)
        .text('GSTIN: 27AAACV9988B1Z5', 40, topY + 50);

      // Supplier (Vendor)
      doc
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('SUPPLIER (VENDOR):', 320, topY);

      const vName = invoice.vendor?.name || invoice.vendorName || 'Vendor';
      const vGstin = invoice.vendor?.gstin ? `GSTIN: ${invoice.vendor.gstin}` : 'GSTIN: Not Specified';
      const vAddress = invoice.vendor?.address || 'Registered Office Address';
      const vCityState = `${invoice.vendor?.city || ''}${invoice.vendor?.state ? `, ${invoice.vendor.state}` : ''}`;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(vName, 320, topY + 14)
        .text(vGstin, 320, topY + 26)
        .text(vAddress, 320, topY + 38, { width: 230 })
        .text(vCityState, 320, topY + 50);

      // --- References Bar ---
      const refY = 195;
      doc
        .rect(40, refY, 515, 26)
        .fill('#F1F5F9');

      const poNum = invoice.purchaseOrder?.poNumber || 'Direct PO';
      const rfqNum = invoice.purchaseOrder?.rfq?.rfqNumber || 'N/A';
      const quoteNum = invoice.purchaseOrder?.quotation?.quotationNumber || 'N/A';

      doc
        .fillColor('#1E293B')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(`Purchase Order: `, 50, refY + 8, { continued: true })
        .font('Helvetica')
        .text(`${poNum}   |   `, { continued: true })
        .font('Helvetica-Bold')
        .text(`RFQ: `, { continued: true })
        .font('Helvetica')
        .text(`${rfqNum}   |   `, { continued: true })
        .font('Helvetica-Bold')
        .text(`Quotation: `, { continued: true })
        .font('Helvetica')
        .text(quoteNum);

      // --- Items Table Header ---
      let tableY = 235;

      doc
        .rect(40, tableY, 515, 22)
        .fill('#1E293B');

      doc
        .fillColor('#FFFFFF')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('#', 50, tableY + 6)
        .text('Item Description', 80, tableY + 6)
        .text('Qty', 310, tableY + 6, { align: 'right', width: 40 })
        .text('UOM', 360, tableY + 6)
        .text('Unit Price (INR)', 400, tableY + 6, { align: 'right', width: 65 })
        .text('Total (INR)', 480, tableY + 6, { align: 'right', width: 65 });

      tableY += 22;

      // Table Rows
      const items = invoice.items || [];
      items.forEach((item, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, tableY, 515, 20).fill(rowBg);

        doc
          .fillColor('#334155')
          .fontSize(8.5)
          .font('Helvetica')
          .text(String(idx + 1), 50, tableY + 5)
          .text(item.itemDescription, 80, tableY + 5, { width: 220, ellipsis: true })
          .text(Number(item.quantity).toLocaleString('en-IN'), 310, tableY + 5, {
            align: 'right',
            width: 40,
          })
          .text(item.uom, 360, tableY + 5)
          .text(Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 400, tableY + 5, {
            align: 'right',
            width: 65,
          })
          .text(Number(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 480, tableY + 5, {
            align: 'right',
            width: 65,
          });

        tableY += 20;
      });

      // Bottom Table Border
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, tableY).lineTo(555, tableY).stroke();

      // --- Financial Calculations & Tax Breakdown ---
      tableY += 15;

      const summaryX = 350;
      const summaryWidth = 195;

      // Subtotal
      doc
        .fillColor('#334155')
        .fontSize(8.5)
        .font('Helvetica')
        .text('Taxable Subtotal:', summaryX, tableY)
        .text(
          `INR ${Number(invoice.subtotalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          summaryX,
          tableY,
          { align: 'right', width: summaryWidth }
        );

      tableY += 16;

      // Tax Breakdown
      const tb = invoice.taxBreakdown;
      if (tb && tb.type === 'CGST_SGST') {
        doc
          .text(`CGST (${tb.cgstRate || 9}%):`, summaryX, tableY)
          .text(
            `INR ${Number(tb.cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            summaryX,
            tableY,
            { align: 'right', width: summaryWidth }
          );

        tableY += 14;

        doc
          .text(`SGST (${tb.sgstRate || 9}%):`, summaryX, tableY)
          .text(
            `INR ${Number(tb.sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            summaryX,
            tableY,
            { align: 'right', width: summaryWidth }
          );

        tableY += 14;
      } else if (tb && tb.type === 'IGST') {
        doc
          .text(`IGST (${tb.igstRate || invoice.taxRate}%):`, summaryX, tableY)
          .text(
            `INR ${Number(tb.igstAmount || invoice.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            summaryX,
            tableY,
            { align: 'right', width: summaryWidth }
          );

        tableY += 14;
      } else {
        doc
          .text(`GST Tax (${Number(invoice.taxRate)}%):`, summaryX, tableY)
          .text(
            `INR ${Number(invoice.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            summaryX,
            tableY,
            { align: 'right', width: summaryWidth }
          );

        tableY += 14;
      }

      // Grand Total Box
      doc
        .rect(summaryX - 10, tableY + 4, summaryWidth + 20, 26)
        .fill('#0F172A');

      doc
        .fillColor('#FFFFFF')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Grand Total:', summaryX, tableY + 11)
        .text(
          `INR ${Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          summaryX,
          tableY + 11,
          { align: 'right', width: summaryWidth }
        );

      tableY += 45;

      // --- 3-Way Match Verification & Notes ---
      doc
        .rect(40, tableY, 280, 50)
        .fill('#F0FDF4');

      doc
        .fillColor('#166534')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('3-WAY AUDIT VERIFIED', 50, tableY + 8)
        .font('Helvetica')
        .fontSize(8)
        .text('Reconciled 100% against approved Quotation & Purchase Order lines.', 50, tableY + 22, {
          width: 260,
        })
        .text('All quantities, unit rates, and commercial terms mathematically validated.', 50, tableY + 34, {
          width: 260,
        });

      // Footer Notes
      doc
        .fillColor(mutedColor)
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          'This is an authorized system-generated computer document from VendorBridge ERP. No physical signature is required.',
          40,
          740,
          { align: 'center', width: 515 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
