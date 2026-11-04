import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db/store';
import { Role } from '../types';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { sendInvoiceEmail } from '../utils/emailService';

/**
 * GET /api/invoices
 * Lists invoices with status filtering and text search.
 * RBAC:
 * - ADMIN, PROCUREMENT_OFFICER, MANAGER_APPROVER: full list
 * - VENDOR: isolated to invoices assigned to the vendor's own profile
 */
export const getInvoices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { status, search } = req.query;
    let vendorId: string | undefined;

    if (req.user.role === Role.VENDOR) {
      const vendor = await db.findVendorByUserId(req.user.id);
      if (!vendor) {
        res.status(200).json({ success: true, count: 0, invoices: [] });
        return;
      }
      vendorId = vendor.id;
    }

    const validStatus = status ? (status as string).toUpperCase() : undefined;
    const invoices = await db.getInvoices({
      status: validStatus,
      search: search ? String(search) : undefined,
      vendorId,
    });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Failed to retrieve invoices',
      message: error.message,
    });
  }
};

/**
 * GET /api/invoices/:id
 * Retrieves full details of a single invoice including line items, vendor, PO, and 3-way matching result.
 * Enforces vendor isolation (403 if vendor attempts to access another vendor's invoice).
 */
export const getInvoiceById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: 'Bad Request', message: 'Invoice ID is required' });
      return;
    }

    let vendorId: string | undefined;
    if (req.user.role === Role.VENDOR) {
      const vendor = await db.findVendorByUserId(req.user.id);
      if (!vendor) {
        res.status(403).json({ error: 'Forbidden', message: 'Vendor profile not found' });
        return;
      }
      vendorId = vendor.id;
    }

    const invoice = await db.getInvoiceById(id, { vendorId });

    if (!invoice) {
      res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
      return;
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    if (error.statusCode === 403) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }
    console.error('Get invoice by ID error:', error);
    res.status(500).json({
      error: 'Failed to retrieve invoice',
      message: error.message,
    });
  }
};

/**
 * POST /api/invoices
 * Creates an authoritative Tax Invoice from an eligible Purchase Order.
 * Enforces:
 * - RBAC: Only ADMIN and PROCUREMENT_OFFICER (vendors and manager_approvers receive 403)
 * - Strict 3-way matching between Quotation, PO, and Invoice
 * - Decimal precision calculations and CGST/SGST/IGST tax breakdown
 * - Exactly one invoice per PO (409 Conflict on duplicate/concurrency)
 */
export const createInvoice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const allowedRoles: Role[] = [Role.ADMIN, Role.PROCUREMENT_OFFICER];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only procurement officers and administrators are authorized to create invoices',
      });
      return;
    }

    const { purchaseOrderId, notes } = req.body;
    if (!purchaseOrderId || typeof purchaseOrderId !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Valid purchaseOrderId string is required to generate an invoice',
      });
      return;
    }

    const invoice = await db.createInvoice(purchaseOrderId, req.user.id, notes);

    res.status(201).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} created and 3-way match verified successfully`,
      invoice,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error:
          error.statusCode === 409
            ? 'Conflict'
            : error.statusCode === 404
            ? 'Not Found'
            : 'Bad Request',
        message: error.message,
        details: error.details,
      });
      return;
    }

    // Prisma unique constraint violation code P2002 if racing
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Conflict',
        message: 'An invoice has already been generated for this purchase order',
      });
      return;
    }

    console.error('Create invoice error:', error);
    res.status(500).json({
      error: 'Failed to create invoice',
      message: error.message,
    });
  }
};

/**
 * POST /api/invoices/:id/mark-paid
 * Marks an eligible invoice as paid.
 * RBAC: Strictly restricted to ADMIN (Finance Authority).
 */
export const markInvoicePaid = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (req.user.role !== Role.ADMIN) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only System Administrators are authorized to authorize payments and mark invoices as paid',
      });
      return;
    }

    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: 'Bad Request', message: 'Invoice ID is required' });
      return;
    }

    const { notes } = req.body;
    const invoice = await db.markInvoicePaid(id, req.user.id, notes);

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} has been successfully marked as paid`,
      invoice,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: error.statusCode === 404 ? 'Not Found' : 'Bad Request',
        message: error.message,
      });
      return;
    }

    console.error('Mark invoice paid error:', error);
    res.status(500).json({
      error: 'Failed to update invoice payment status',
      message: error.message,
    });
  }
};

/**
 * GET /api/invoices/:id/pdf
 * Generates and streams a downloadable binary PDF for the invoice.
 * Enforces vendor data isolation.
 */
export const downloadInvoicePdf = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    let vendorId: string | undefined;

    if (req.user.role === Role.VENDOR) {
      const vendor = await db.findVendorByUserId(req.user.id);
      if (!vendor) {
        res.status(403).json({ error: 'Forbidden', message: 'Vendor profile not found' });
        return;
      }
      vendorId = vendor.id;
    }

    const invoice = await db.getInvoiceById(id, { vendorId });

    if (!invoice) {
      res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
      return;
    }

    const pdfBuffer = await generateInvoicePdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error: any) {
    if (error.statusCode === 403) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }
    console.error('Download invoice PDF error:', error);
    res.status(500).json({
      error: 'Failed to generate invoice PDF',
      message: error.message,
    });
  }
};

/**
 * POST /api/invoices/:id/email
 * Transmits invoice PDF via SMTP if configured, or returns truthful EMAIL_NOT_CONFIGURED.
 * Enforces strict recipient verification:
 * - Vendors may ONLY dispatch to trusted addresses (their verified company email or the buyer's procurement contact)
 * - Arbitrary recipient email addresses from untrusted clients are strictly forbidden.
 */
export const emailInvoice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const allowedRoles: Role[] = [Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.VENDOR];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to transmit invoice emails',
      });
      return;
    }

    const id = req.params.id as string;
    let vendorId: string | undefined;

    if (req.user.role === Role.VENDOR) {
      const vendor = await db.findVendorByUserId(req.user.id);
      if (!vendor) {
        res.status(403).json({ error: 'Forbidden', message: 'Vendor profile not found' });
        return;
      }
      vendorId = vendor.id;
    }

    const invoice = await db.getInvoiceById(id, { vendorId });

    if (!invoice) {
      res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });
      return;
    }

    const { recipientEmail, notes } = req.body;
    let targetEmail: string;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (req.user.role === Role.VENDOR) {
      // Vendors must only send to verified trusted addresses
      const trustedAddresses = [
        invoice.vendor?.email?.toLowerCase().trim(),
        req.user.email.toLowerCase().trim(),
        invoice.createdBy?.email?.toLowerCase().trim(),
      ].filter(Boolean);

      if (recipientEmail && recipientEmail.trim()) {
        const requestedEmail = recipientEmail.trim().toLowerCase();
        if (!trustedAddresses.includes(requestedEmail)) {
          res.status(403).json({
            error: 'Forbidden',
            message:
              'Access denied: Vendors may only transmit invoices to their verified company email or the authorized buyer procurement contact. Arbitrary recipient addresses are not permitted.',
          });
          return;
        }
        targetEmail = requestedEmail;
      } else {
        targetEmail = invoice.vendor?.email || req.user.email;
      }
    } else {
      // Internal staff (Admin, Officer)
      if (recipientEmail && recipientEmail.trim()) {
        const requested = recipientEmail.trim();
        if (!emailRegex.test(requested)) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid recipient email address format',
          });
          return;
        }
        targetEmail = requested;
      } else {
        targetEmail = invoice.vendor?.email || req.user.email;
      }
    }

    if (!targetEmail || !emailRegex.test(targetEmail)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'No valid recipient email address could be resolved for this invoice',
      });
      return;
    }

    const pdfBuffer = await generateInvoicePdf(invoice);
    const result = await sendInvoiceEmail({
      invoice,
      recipientEmail: targetEmail,
      pdfBuffer,
      notes,
    });

    res.status(200).json(result);
  } catch (error: any) {
    if (error.statusCode === 403) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }
    console.error('Email invoice error:', error);
    res.status(500).json({
      error: 'Failed to dispatch invoice email',
      message: 'An error occurred during invoice email transmission',
    });
  }
};
