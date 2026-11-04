import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '../types';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  markInvoicePaid,
  downloadInvoicePdf,
  emailInvoice,
} from '../controllers/invoiceController';

const router = Router();

// Invoices Queue & Listing (Supports ?status=PENDING_PAYMENT/PAID/CANCELLED/ALL & ?search=...)
router.get('/', authenticate, getInvoices);

// Invoice Details with line items, vendor details, and 3-way matching dossier
router.get('/:id', authenticate, getInvoiceById);

// Create Invoice from Eligible Purchase Order (Restricted to ADMIN & PROCUREMENT_OFFICER)
router.post(
  '/',
  authenticate,
  requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER]),
  createInvoice
);

// Mark Invoice as Paid (Restricted to ADMIN)
router.post(
  '/:id/mark-paid',
  authenticate,
  requireRole([Role.ADMIN]),
  markInvoicePaid
);

// Download Authoritative Invoice PDF
router.get('/:id/pdf', authenticate, downloadInvoicePdf);

// Transmit Invoice via Email
router.post('/:id/email', authenticate, emailInvoice);

export default router;
