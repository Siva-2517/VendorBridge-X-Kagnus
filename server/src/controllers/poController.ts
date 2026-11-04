import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db/store';
import { Role } from '../types';

/**
 * GET /api/purchase-orders
 * Lists purchase orders with status filtering and text search.
 * RBAC:
 * - ADMIN, MANAGER_APPROVER, PROCUREMENT_OFFICER: view all POs (or filtered)
 * - VENDOR: isolated view, only POs assigned to the vendor's own profile
 */
export const getPurchaseOrders = async (
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
        res.status(200).json({ success: true, count: 0, purchaseOrders: [] });
        return;
      }
      vendorId = vendor.id;
    }

    const validStatus = status ? (status as string).toUpperCase() : undefined;
    const purchaseOrders = await db.getPurchaseOrders({
      status: validStatus,
      search: search ? String(search) : undefined,
      vendorId,
    });

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      purchaseOrders,
    });
  } catch (error: any) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      error: 'Failed to retrieve purchase orders',
      message: error.message,
    });
  }
};

/**
 * GET /api/purchase-orders/:id
 * Retrieves full details of a single purchase order including items, quotation, RFQ, and approval.
 * Enforces vendor isolation (403 if vendor attempts to access another vendor's PO).
 */
export const getPurchaseOrderById = async (
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
      res.status(400).json({ error: 'Bad Request', message: 'Purchase order ID is required' });
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

    const po = await db.getPurchaseOrderById(id, { vendorId });

    if (!po) {
      res.status(404).json({ error: 'Not Found', message: 'Purchase order not found' });
      return;
    }

    res.status(200).json({
      success: true,
      purchaseOrder: po,
    });
  } catch (error: any) {
    if (error.statusCode === 403) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }
    console.error('Get purchase order by ID error:', error);
    res.status(500).json({
      error: 'Failed to retrieve purchase order',
      message: error.message,
    });
  }
};

/**
 * POST /api/purchase-orders/generate
 * Authoritatively generates a Purchase Order from an approved Quotation and approved ApprovalRequest.
 * Enforces:
 * - Backend calculates all financial totals using Prisma.Decimal
 * - Only ADMIN, PROCUREMENT_OFFICER, MANAGER_APPROVER (enforced by route middleware & controller)
 * - Quotation must be APPROVED and have an APPROVED ApprovalRequest
 * - Strictly 1 PO per Quotation (409 Conflict on duplicate/concurrent attempts)
 */
export const generatePurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Explicit role guard
    const allowedRoles: Role[] = [Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.MANAGER_APPROVER];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only procurement officers, managers, or administrators can generate purchase orders',
      });
      return;
    }

    const { quotationId, notes } = req.body;
    if (!quotationId || typeof quotationId !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Valid quotationId string is required to generate a purchase order',
      });
      return;
    }

    const po = await db.generatePurchaseOrder(quotationId, req.user.id, notes);

    res.status(201).json({
      success: true,
      message: `Purchase order ${po.poNumber} generated successfully`,
      purchaseOrder: po,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        error: error.statusCode === 409 ? 'Conflict' : error.statusCode === 404 ? 'Not Found' : 'Bad Request',
        message: error.message,
      });
      return;
    }

    // Handle Prisma unique constraint violation code P2002 if racing
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Conflict',
        message: 'A purchase order has already been generated for this quotation',
      });
      return;
    }

    console.error('Generate purchase order error:', error);
    res.status(500).json({
      error: 'Failed to generate purchase order',
      message: error.message,
    });
  }
};
