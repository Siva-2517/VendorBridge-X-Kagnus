import nodemailer from 'nodemailer';
import { Invoice } from '../types';

export interface SendInvoiceEmailParams {
  invoice: Invoice;
  recipientEmail: string;
  pdfBuffer: Buffer;
  notes?: string;
}

export interface SendInvoiceEmailResult {
  success: boolean;
  code: 'EMAIL_SENT' | 'EMAIL_NOT_CONFIGURED' | 'EMAIL_DELIVERY_FAILED';
  message: string;
  recipient: string;
  details?: string;
}

/**
 * Delivers an invoice PDF via SMTP if configured in environment variables.
 * Returns truthful, auditable delivery result without faking success.
 */
export const sendInvoiceEmail = async (
  params: SendInvoiceEmailParams
): Promise<SendInvoiceEmailResult> => {
  const { invoice, recipientEmail, pdfBuffer, notes } = params;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const from = process.env.SMTP_FROM || 'VendorBridge Billing <billing@vendorbridge.com>';

  // Truthful check: Is SMTP configured on the host?
  if (!host || !user || !pass) {
    return {
      success: false,
      code: 'EMAIL_NOT_CONFIGURED',
      message:
        'SMTP email delivery is not configured on this server. To enable real delivery, configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in the server environment.',
      recipient: recipientEmail,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });

    const vName = invoice.vendor?.name || invoice.vendorName || 'Vendor';
    const amountStr = Number(invoice.grandTotal).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    });

    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: `Tax Invoice ${invoice.invoiceNumber} — VendorBridge [Amount: INR ${amountStr}]`,
      text: `Hello,\n\nPlease find attached official Tax Invoice ${invoice.invoiceNumber} for Purchase Order ${invoice.purchaseOrder?.poNumber || ''}.\n\nSupplier: ${vName}\nGrand Total: INR ${amountStr}\nStatus: ${invoice.status}\n\n${notes ? `Additional Instructions: ${notes}\n\n` : ''}Thank you,\nVendorBridge Finance & Procurement Team`,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return {
      success: true,
      code: 'EMAIL_SENT',
      message: `Invoice ${invoice.invoiceNumber} was successfully transmitted to ${recipientEmail}`,
      recipient: recipientEmail,
    };
  } catch (err: any) {
    console.error('SMTP delivery error:', err.message);
    return {
      success: false,
      code: 'EMAIL_DELIVERY_FAILED',
      message: `Failed to deliver email to ${recipientEmail}. Please verify SMTP network connectivity and mail server configuration.`,
      recipient: recipientEmail,
    };
  }
};
